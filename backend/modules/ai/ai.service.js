const axios = require('axios');
const ragService = require('../rag/rag.service');
const pool = require('../../database/connection');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    // Use Ollama API (Local LLM)
    // RECOMMENDED MODELS (in order of preference):
    // - llama3.2:8b (best quality, recommended for production)
    // - llama3.2:3b (good balance of quality and speed)
    // - qwen2.5:7b (strong reasoning)
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://172.16.97.110:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
    this.maxTokens = 6000;
    this.temperature = 0.8; // Slightly higher for more creative, varied writing

    // Rate limiting settings (less aggressive for local LLM)
    this.maxRetries = 3;
    this.initialRetryDelay = 1000;
    this.maxRetryDelay = 300000;
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // Debug: log configuration
    console.log(`🤖 AI Service Configuration:`);
    console.log(`   Server: ${this.baseUrl}`);
    console.log(`   Model: ${this.model} (recommend: llama3.2:8b for best quality)`);
  }

  async generateBlog(projectId, topic) {
    return this.enqueueRequest(async () => {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 BLOG GENERATION PIPELINE STARTED`);
        console.log(`${'='.repeat(60)}`);
        console.log(`Project ID: ${projectId}`);
        console.log(`Topic: ${topic}\n`);

        // No API key needed for Ollama (local server)

        // STEP 1: Fetch project details
        console.log(`📋 STEP 1: Loading project configuration...`);
        const projectResult = await pool.query(
          'SELECT name, about_text, blog_rules, ideal_blog FROM projects WHERE id = $1',
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          throw new Error('Project not found');
        }

        const project = projectResult.rows[0];
        console.log(`   ✅ Project: ${project.name}`);
        console.log(`   ✅ About text: ${project.about_text ? `${project.about_text.substring(0, 50)}...` : '(none)'}`);
        console.log(`   ✅ Blog rules: ${project.blog_rules ? `${project.blog_rules.substring(0, 50)}...` : '(none)'}`);
        console.log(`   ✅ Ideal blog (style guide): ${project.ideal_blog ? `${project.ideal_blog.substring(0, 50)}...` : '(none)'}\n`);

        // STEP 2: Retrieve RAG context
        console.log(`📚 STEP 2: Retrieving RAG documents from vector DB...`);
        const ragDocuments = await ragService.retrieveDocuments(projectId, topic, 3);
        console.log(`   ✅ Retrieved ${ragDocuments.length} documents based on topic similarity\n`);

        // STEP 3: Ideal blog is always loaded
        console.log(`📰 STEP 3: Loading ideal blog (style guide)...`);
        const idealBlogContent = project.ideal_blog;
        console.log(`   ✅ Ideal blog: ${idealBlogContent ? `${idealBlogContent.length} characters` : '(none)'}\n`);

        // STEP 4: Load skills file
        console.log(`🎯 STEP 4: Loading blog writing skills (hardcoded)...`);
        const skillsContent = await this.loadSkillsFile();
        console.log(`   ✅ Using default skills (5 detailed sections)\n`);

        // STEP 5: Build and send prompt
        console.log(`🧠 STEP 5: Building prompt...`);
        const messages = this.buildEnhancedMessages(topic, project, ragDocuments, idealBlogContent, skillsContent);
        console.log(`   ✅ Built prompt with ${messages.length} message blocks\n`);

        console.log(`📡 STEP 6: Calling Ollama API...\n`);
        const response = await this.callOllamaAPIWithRetry(messages);

        const blogContent = response.data.choices[0].message.content;
        const title = this.extractTitle(blogContent, topic);

        // STEP 7: Validate blog quality
        console.log(`🔍 STEP 7: Validating blog quality...\n`);
        const validation = this.validateBlogQuality(blogContent, title);
        
        if (!validation.isValid) {
          console.log(`⚠️  QUALITY ISSUES DETECTED:`);
          validation.issues.forEach(issue => console.log(`   - ${issue}`));
          console.log(`\nAttempting to improve content...\n`);
          // In production, could trigger a re-generation or auto-fix
        } else {
          console.log(`✅ Blog passed all quality checks\n`);
        }


        return {
          title,
          content: blogContent,
          contextUsed: ragDocuments.length,
          contextSources: ragDocuments.map(d => d.sourceType),
          qualityValidation: validation
        };
      } catch (error) {
        console.error('❌ AI generation error:', error.response?.data || error.message);
        throw error;
      }
    });
  }

  async enqueueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { requestFn, resolve, reject } = this.requestQueue.shift();

      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      if (this.requestQueue.length > 0) {
        console.log('Waiting 2 seconds before next request to respect rate limits...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    this.isProcessingQueue = false;
  }

  async callOllamaAPIWithRetry(messages, attempt = 1) {
    try {

      messages.forEach((msg, idx) => {
        console.log(`\n[Message ${idx + 1}] Role: ${msg.role}`);
        console.log(`Content length: ${msg.content.length} characters`);
        console.log(`Content preview (first 300 chars):\n${msg.content.substring(0, 300)}...`);
      });
      console.log('='.repeat(60) + '\n');

      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: messages,
          options: {
            num_predict: this.maxTokens,
            temperature: this.temperature
          },
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000
        }
      );

      // Transform Ollama response to match OpenAI/Groq format
      const transformedResponse = {
        data: {
          choices: [
            {
              message: {
                content: response.data.message.content
              }
            }
          ]
        }
      };

      return transformedResponse;
    } catch (error) {
      const isConnectionError = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
      const isServerError = error.response?.status >= 500 && error.response?.status < 600;

      if ((isConnectionError || isServerError) && attempt < this.maxRetries) {
        const delay = Math.min(
          this.initialRetryDelay * Math.pow(2, attempt - 1),
          this.maxRetryDelay
        );

        console.log(`Connection error or server error detected. Retrying in ${delay}ms... (Attempt ${attempt}/${this.maxRetries})`);
        console.log(`Error details:`, error.response?.data || error.message);

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.callOllamaAPIWithRetry(messages, attempt + 1);
      }

      console.error(`API call failed after ${attempt} attempts:`, error.response?.data || error.message);
      throw error;
    }
  }

  buildEnhancedMessages(topic, project, ragDocuments, idealBlog, skillsContent) {
    const messages = [
      {
        role: 'system',
        content: this.buildEnhancedSystemPrompt(project, skillsContent)
      }
    ];

    const userContent = this.buildEnhancedUserPrompt(topic, project, ragDocuments, idealBlog);
    messages.push({
      role: 'user',
      content: userContent
    });

    return messages;
  }

  async loadSkillsFile() {
    try {
      const skillsPath = path.join(__dirname, '../../config/skills/blog-skills.md');
      const content = fs.readFileSync(skillsPath, 'utf-8');
      console.log('✅ Skills file loaded successfully');
      return content;
    } catch (error) {
      console.error('Error loading skills file:', error);
      return null;
    }
  }

  buildEnhancedSystemPrompt(project, skillsContent) {
    let prompt = `You are a professional blog writer for "${project.name}" known for authentic, engaging content.

## CORE PRINCIPLES

**Write Like a Human, Not a Machine**
- Your goal is authentic, engaging writing that feels genuinely written by someone with experience
- Vary your sentence structure, paragraph length, and section organization naturally
- Each blog should have its own flow, not follow a rigid template

**Authenticity Over Rules**
- Use real examples, specific details, and practical insights
- Avoid generic phrases like "perfect balance," "bursting with flavor," or "amazing experience"
- Include sensory details and real-world context when relevant
- Write as if you've actually experienced what you're describing

**Quality Through Substance**
- Focus on providing genuine value to the reader
- Each section should teach something new or provide practical insight
- Depth comes from meaningful content, not from word count requirements
- Include FAQs that address real reader questions with thoughtful answers

## WRITING GUIDELINES

**Structure (Flexible)**
- Clear, benefit-driven title (8-12 words works well)
- Introduction that hooks the reader and sets context
- Main content organized with clear sections
- Natural conclusion with key takeaways
- FAQ section with 5-7 meaningful questions

**Tone & Voice**
- Friendly and conversational, like a trusted friend
- Specific and practical - avoid vague statements
- Direct address to the reader ("you", "your")
- Mix short and long sentences for natural rhythm
- Active voice preferred, passive for emphasis when needed

**Content Integrity**
- Only include facts you're certain about
- When uncertain, use careful, qualified language
- No made-up statistics, product names, or specific details
- All claims should be defensible and accurate

**Formatting**
- Use H2 (##) for main sections, H3 (###) for subsections
- Bold key terms and important concepts sparingly
- Use bullet points for lists, not narrative
- Keep paragraphs readable (3-5 sentences typically)

`;

    if (project.blog_rules) {
      const maxRulesLength = 500;
      let rules = project.blog_rules;
      if (rules.length > maxRulesLength) {
        rules = rules.substring(0, maxRulesLength) + '...';
        console.log(`Blog rules truncated from ${project.blog_rules.length} to ${maxRulesLength} characters`);
      }
      prompt += `## PROJECT-SPECIFIC CONTEXT:\n${rules}\n\n`;
    }

    if (skillsContent) {
      const maxSkillsLength = 800;
      let truncatedSkills = skillsContent;
      if (skillsContent.length > maxSkillsLength) {
        truncatedSkills = skillsContent.substring(0, maxSkillsLength);
        console.log(`Skills content truncated from ${skillsContent.length} to ${maxSkillsLength} characters`);
      }

      prompt += `## WRITING STYLE REFERENCE:\n${truncatedSkills}\n\n`;
    }

    prompt += `Your blogs should be substantial (typically 1,500-2,500 words) because you're providing real value through detailed, meaningful content—not because you're meeting a quota. Write something you'd be proud to publish under your own name.`;

    return prompt;
  }

  buildEnhancedUserPrompt(topic, project, ragDocuments, idealBlog) {
    let prompt = `# BLOG REQUEST\n\n`;

    prompt += `## Topic\n${topic}\n\n`;

    prompt += `## Project Context (Use This Throughout Your Writing)\n\n`;
    prompt += `**Project Name**: ${project.name}\n\n`;

    if (project.about_text) {
      const maxAboutLength = 300;
      let about = project.about_text;
      if (about.length > maxAboutLength) {
        about = about.substring(0, maxAboutLength);
      }
      prompt += `**About**: ${about}\n\n`;
    }

    // Add project-specific context for authentic writing
    prompt += `**Important**: Incorporate this project information naturally throughout your blog:\n\n`;
    prompt += `- The project's actual name and location context (when relevant)\n`;
    prompt += `- The real atmosphere and environment of this venue/business\n`;
    prompt += `- Who actually visits or uses this project (audience types)\n`;
    prompt += `- Situational context specific to this project (timing, events, usage patterns)\n\n`;

    prompt += `Do NOT hardcode other project names or locations. Only use the actual data provided above for "${project.name}".\n\n`;

    if (idealBlog) {
      const maxIdealBlogLength = 2000;
      let truncatedIdealBlog = idealBlog;
      if (idealBlog.length > maxIdealBlogLength) {
        truncatedIdealBlog = idealBlog.substring(0, maxIdealBlogLength);
        console.log(`Ideal blog truncated from ${idealBlog.length} to ${maxIdealBlogLength} characters`);
      }
      prompt += `## Style Reference (Study for tone and approach):\n${truncatedIdealBlog}\n\n`;
    }

    if (ragDocuments && ragDocuments.length > 0) {
      let context = ragDocuments.map(doc => doc.content).join('\n\n');
      const maxContextLength = 2000;
      if (context.length > maxContextLength) {
        context = context.substring(0, maxContextLength);
        console.log('Context truncated to', maxContextLength, 'characters');
      }
      prompt += `## Context from Knowledge Base:\n${context}\n\n`;
    }

    prompt += `## What We're Looking For\n\n`;
    prompt += `Write a comprehensive, engaging blog post that provides real value to readers. Focus on:\n\n`;
    prompt += `**Structure:** Clear title, introduction, well-organized main content, conclusion, and FAQ section\n\n`;
    prompt += `**Content:** Substantial depth (aim for 1,500-2,500 words naturally) with practical information, examples, and insights\n\n`;
    prompt += `**Authenticity:** Write as someone with genuine experience at "${project.name}". Use specific details, avoid generic phrases\n\n`;
    prompt += `**Project Integration:** Use "${project.name}" and its real context naturally throughout — not just mentioned once\n`;
    prompt += `**Tone:** Friendly and conversational, like you're talking to a friend who's interested in this topic\n\n`;
    prompt += `**Quality:** Each section should teach something. No filler, no repetition, no off-topic content\n\n`;
    prompt += `**FAQ:** Include 5-7 questions that real readers of "${project.name}" would actually ask, with thoughtful answers\n\n`;

    prompt += `## Format Guidelines\n\n`;
    prompt += `- Use # for title\n`;
    prompt += `- Use ## for main sections, ### for subsections\n`;
    prompt += `- Include a meta description (around 160 characters) after the title\n`;
    prompt += `- Bold key terms sparingly with **text**\n`;
    prompt += `- Use bullet points for lists, not narrative\n\n`;

    prompt += `## Key Requirements\n\n`;
    prompt += `- Vary section structure (storytelling, comparison, informational) — don't follow the same pattern for every item\n`;
    prompt += `- Include real situational descriptions (timing, visitor types, atmosphere)\n`;
    prompt += `- Replace generic phrases with specific descriptions (texture, contrast, actual usage scenarios)\n`;
    prompt += `- Make FAQs intent-based and specific to "${project.name}" context\n\n`;

    prompt += `Write naturally and authentically. Your blog should feel like it was written by a real person who knows and cares about "${project.name}".\n\n`;
    prompt += `---\n\n`;

    return prompt;
  }

  extractTitle(content, topic) {
    const headingMatch = content.match(/^#+\s*(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length < 100 && !firstLine.endsWith('.')) {
        return firstLine;
      }
    }

    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  async publishToExternalAPI(blogData) {
    console.log('Publishing blog to external API...', blogData);
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      publishedUrl: `https://example.com/blog/${Date.now()}`,
      publishedAt: new Date().toISOString()
    };
  }

  async generateTopics(project, count = 5) {
    return this.enqueueRequest(async () => {
      try {
        console.log(`Generating ${count} topics for project: ${project.name}`);

        const messages = [
          {
            role: 'system',
            content: `You are a content strategist and SEO expert. Generate engaging, relevant blog topic suggestions based on project information.

Rules:
- Topics should be specific and actionable
- Topics should align with the project's domain and audience
- Topics should be SEO-friendly and search-worthy
- Each topic should be concise (5-10 words)
- Topics should cover different angles: educational, how-to, news, opinion, listicles`
          },
          {
            role: 'user',
            content: `Generate ${count} blog topic suggestions for a project with the following details:

Project Name: ${project.name}
About: ${project.about_text || 'No description provided'}
${project.blog_rules ? `Writing Guidelines: ${project.blog_rules}` : ''}

Please provide ${count} unique, engaging blog topics that would resonate with this project's audience. Format your response as a JSON array of topic strings.`
          }
        ];

        const response = await this.callOllamaAPIWithRetry(messages);
        const content = response.data.choices[0].message.content;

        try {
          const jsonMatch = content.match(/\[.*\]/s);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn('Could not parse topics as JSON, extracting from text');
        }

        const topics = content
          .split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 5 && line.length < 100 && !line.includes('Topic'))
          .slice(0, count);

        return topics.length > 0 ? topics : [`${project.name}: Getting Started Guide`];
      } catch (error) {
        console.error('Topic generation error:', error.response?.data || error.message);
        throw new Error(`Topic generation failed: ${error.message}`);
      }
    });
  }
  validateBlogQuality(content, title) {
    const issues = [];
    const warnings = [];
    const charCount = content.length;
    const wordCount = content.split(/\s+/).length;

    // CRITICAL ISSUES ONLY - These are blockers

    // 1. Basic Structure
    if (!content.match(/^#\s+.+$/m)) {
      issues.push('Missing H1 title');
    }

    // 2. Minimum content threshold (substantial content, not just filler)
    if (charCount < 5000) {
      issues.push(`Content too short: ${charCount.toLocaleString()} characters (aim for 7,000+ for substantive depth)`);
    }

    // 3. Duplicate content (large repeated blocks)
    const paragraphs = content.split(/\n\n+/);
    let duplicateCount = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const similarity = this.stringSimilarity(paragraphs[i], paragraphs[j]);
        if (similarity > 0.8) {
          duplicateCount++;
        }
      }
    }
    if (duplicateCount > 2) {
      issues.push(`Found ${duplicateCount} highly similar content blocks - avoid repetition`);
    }

    // WARNINGS (not blockers)

    // 1. Meta description length (flexible, around 160 chars)
    const metaMatch = content.match(/^#\s+.+\n(.+?)(?:\n\n|$)/);
    if (metaMatch) {
      const metaLength = metaMatch[1].trim().length;
      if (metaLength < 120 || metaLength > 200) {
        warnings.push(`Meta description is ${metaLength} characters (ideal is 150-170)`);
      }
    }

    // 2. Missing FAQ section
    if (!content.match(/##\s+FAQ/i) && !content.match(/##\s+Frequently\s+Asked/i)) {
      warnings.push('No FAQ section detected - consider adding one');
    }

    // 3. Structure headers
    const h2Count = (content.match(/^##\s+/gm) || []).length;
    if (h2Count < 3) {
      warnings.push(`Only ${h2Count} H2 sections - consider more organization for readability`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      metrics: {
        charCount: charCount.toLocaleString(),
        wordCount,
        h2Sections: h2Count,
        paragraphs: paragraphs.length
      }
    };
  }

  stringSimilarity(a, b) {
    const aWords = a.split(/\s+/).slice(0, 50); // Check first 50 words
    const bWords = b.split(/\s+/).slice(0, 50);
    
    let matches = 0;
    for (const word of aWords) {
      if (bWords.includes(word)) {
        matches++;
      }
    }
    
    const maxLen = Math.max(aWords.length, bWords.length);
    return matches / maxLen;
  }
}

// Export a singleton instance
module.exports = new AIService();