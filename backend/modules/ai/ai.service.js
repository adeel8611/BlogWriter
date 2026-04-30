const axios = require('axios');
const ragService = require('../rag/rag.service');
const pool = require('../../database/connection');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    // Use Ollama API (Local LLM)
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://172.16.97.110:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
    this.maxTokens = 6000;
    this.temperature = 0.7;

    // Rate limiting settings (less aggressive for local LLM)
    this.maxRetries = 3;
    this.initialRetryDelay = 1000;
    this.maxRetryDelay = 30000;
    this.requestQueue = [];
    this.isProcessingQueue = false;

    // Debug: log configuration
    console.log(`🤖 AI Service Configuration:`);
    console.log(`   Server: ${this.baseUrl}`);
    console.log(`   Model: ${this.model}`);
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
    let prompt = `You are a professional blog writer for "${project.name}".

## CRITICAL: OUTPUT FORMAT IS HTML (NOT MARKDOWN)
- Use <h3> tags for section headings
- Use <b> tags for bold text
- Use <p> tags for paragraphs
- NO markdown symbols (*, #) anywhere
- Output must be HTML-ready for web publication

## PRIMARY DIRECTIVE: STAY ON TOPIC
- Write ONLY content relevant to the given topic
- NO off-topic tangents or random insertions
- EVERY sentence must serve the main theme
- Remove anything that doesn't belong

## CRITICAL QUALITY REQUIREMENTS:

### 1. ACCURACY & FACTUAL INTEGRITY
- NEVER include false, made-up, or "hallucinated" information
- Only claim facts you are absolutely certain about
- If unsure about a specific detail, use general/safe language instead
- Verify all definitions, claims, and examples are accurate
- Do not make up product names, statistics, or specific details

### 2. STRUCTURE & ORGANIZATION
- REQUIRED: H1 title (# Title Here)
- REQUIRED: Meta description (160 characters) as first line after H1
- REQUIRED: Introduction section (150-200 words)
- REQUIRED: 3-5 main content sections (each H2)
- REQUIRED: Conclusion section (75-125 words)
- Each main section should have 150-200 words of quality content
- NO duplicate or repeated sections (never copy-paste content twice)
- NO rambling or off-topic tangents
- Clear, logical flow from start to finish

### 3. FORMATTING & READABILITY
- Use H2 (##) for main sections, H3 (###) for subsections
- Include comparison tables where relevant (markdown format)
- Use bullet points ONLY for lists, not narrative paragraphs
- Bold key concepts and important terms
- Keep paragraphs to 3-5 sentences maximum
- Ensure "skimmable" structure (readers can scan and understand)

### 4. TONE & VOICE
- Friendly and conversational (sound like a trusted friend)
- Specific and practical (avoid generic statements)
- Confident but not salesy
- Use "you" and "your" to address reader
- Active voice, varied sentence length
- No marketing hype or fluff ("amazing", "revolutionary")

### 5. RELEVANCE & BRAND ALIGNMENT
- Content must be directly relevant to the topic
- NO random insertions of unrelated products/services
- Any CTA must feel natural and on-brand
- All sections must serve the main topic
- Remove anything that doesn't belong

### 6. SEO OPTIMIZATION
- Include meta description (160 characters)
- Integrate 2-3 keywords naturally throughout
- Use clear heading hierarchy (H1, H2, H3)
- Proper markdown formatting aids SEO
- Answer search intent comprehensively

### 7. QUALITY CHECKS BEFORE OUTPUT
Before finalizing:
- ✓ Is every fact accurate?
- ✓ Are there any duplicate sections?
- ✓ Is all content relevant?
- ✓ Is the tone consistent?
- ✓ Is the structure clear?
- ✓ Minimum 9,000 characters?
- ✓ HTML formatted with <h3>, <b>, <p> tags?
- ✓ No markdown symbols (*, #)?

`;

    if (project.blog_rules) {
      const maxRulesLength = 250;
      let rules = project.blog_rules;
      if (rules.length > maxRulesLength) {
        rules = rules.substring(0, maxRulesLength);
      }
      prompt += `PROJECT GUIDELINES:\n${rules}\n\n`;
    }

    if (skillsContent) {
      const maxSkillsLength = 600;
      let truncatedSkills = skillsContent;
      if (skillsContent.length > maxSkillsLength) {
        truncatedSkills = skillsContent.substring(0, maxSkillsLength);
      }

      prompt += `WRITING STANDARDS:\n${truncatedSkills}\n\n`;
    }

    prompt += `FINAL RULES: Output HTML format. Stay on topic. Minimum 9,000 characters. Accurate facts only.`;

    return prompt;
  }

  buildEnhancedUserPrompt(topic, project, ragDocuments, idealBlog) {
    let prompt = `BLOG GENERATION REQUEST\n\n`;
    
    prompt += `TOPIC: ${topic}\n\n`;

    if (project.about_text) {
      const maxAboutLength = 250;
      let about = project.about_text;
      if (about.length > maxAboutLength) {
        about = about.substring(0, maxAboutLength);
      }
      prompt += `PROJECT: About ${project.name}:\n${about}\n\n`;
    }

    if (idealBlog) {
      const maxIdealBlogLength = 1500;
      let truncatedIdealBlog = idealBlog;
      if (idealBlog.length > maxIdealBlogLength) {
        truncatedIdealBlog = idealBlog.substring(0, maxIdealBlogLength);
      }
      prompt += `STYLE REFERENCE (quality & tone):\n${truncatedIdealBlog}\n\n`;
    }

    if (ragDocuments && ragDocuments.length > 0) {
      let context = ragDocuments.map(doc => doc.content).join('\n\n');
      const maxContextLength = 1500;
      if (context.length > maxContextLength) {
        context = context.substring(0, maxContextLength);
      }
      prompt += `KNOWLEDGE BASE:\n${context}\n\n`;
    }

    prompt += `OUTPUT FORMAT: HTML (NOT MARKDOWN)\n`;
    prompt += `- Use <h3> tags for section headings\n`;
    prompt += `- Use <b> tags for bold text\n`;
    prompt += `- Use <p> tags for paragraphs\n`;
    prompt += `- NO * or # symbols\n`;
    prompt += `- HTML-ready output\n\n`;

    prompt += `REQUIRED STRUCTURE:\n`;
    prompt += `1. Title (plain text, first line)\n`;
    prompt += `2. Meta Description (160 characters)\n`;
    prompt += `3. Introduction (150-250 words)\n`;
    prompt += `4. Main Content with <h3> headers\n`;
    prompt += `5. FAQ Section (6-8 questions)\n`;
    prompt += `6. Total: 9,000+ characters minimum\n\n`;

    prompt += `CRITICAL REQUIREMENTS:\n`;
    prompt += `- STAY ON TOPIC: Every sentence relevant to main topic\n`;
    prompt += `- NO OFF-TOPIC: No random tangents or unrelated content\n`;
    prompt += `- ACCURACY: All facts correct and verifiable\n`;
    prompt += `- LENGTH: Minimum 9,000 characters (~2,000-2,500 words)\n`;
    prompt += `- PER SECTION: 150-200 words each\n`;
    prompt += `- NO PADDING: Substantive content only\n`;
    prompt += `- TONE: Friendly, specific, practical, confident\n\n`;

    prompt += `NOW WRITE THE COMPLETE BLOG IN HTML:\n`;
    prompt += `Title on first line, Meta Description on second\n`;
    prompt += `Then full blog with <h3>, <b>, <p> tags\n\n`;

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
    const wordCount = content.split(/\s+/).length;
    
    // Check 1: Word Count
    if (wordCount < 1200) {
      issues.push(`Content too short: ${wordCount} words (minimum 1,200 required)`);
    }
    
    // Check 2: Structure - Look for H1
    if (!content.match(/^#\s+.+$/m)) {
      issues.push('Missing H1 title (# Title format)');
    }
    
    // Check 3: Meta Description (EXACTLY 160 chars - CRITICAL)
    const metaMatch = content.match(/^#\s+.+\n(.+?)(?:\n\n|$)/);
    let metaLength = 0;
    if (metaMatch) {
      metaLength = metaMatch[1].trim().length;
      if (metaLength < 150 || metaLength > 170) {
        issues.push(`Meta description is ${metaLength} characters (MUST be 150-170, closer to 160). Current: "${metaMatch[1].trim().substring(0, 50)}..."`);
      }
    } else {
      issues.push('Missing meta description (should be on line 2, after H1 title)');
    }
    
    // Check 4: Introduction
    const hasIntro = content.match(/##\s+(Introduction|Overview|Background)/i);
    if (!hasIntro) {
      warnings.push('Missing explicit Introduction section header');
    }
    
    // Check 5: Conclusion
    const hasConclusion = content.match(/##\s+(Conclusion|Summary|Final\s+Thoughts)/i);
    if (!hasConclusion) {
      warnings.push('Missing explicit Conclusion section header');
    }
    
    // Check 6: Duplicate Sections (look for repeated headers)
    const headers = content.match(/^#+\s+.+$/gm) || [];
    const headerTexts = headers.map(h => h.toLowerCase());
    const headerSet = new Set(headerTexts);
    if (headerSet.size < headerTexts.length) {
      issues.push('Duplicate section headers detected');
    }
    
    // Check 7: Duplicate Content (look for large repeated text blocks)
    const paragraphs = content.split(/\n\n+/);
    const duplicateBlocks = [];
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const similarity = this.stringSimilarity(paragraphs[i], paragraphs[j]);
        if (similarity > 0.75) {
          duplicateBlocks.push({
            para1: paragraphs[i].substring(0, 40),
            para2: paragraphs[j].substring(0, 40),
            similarity: (similarity * 100).toFixed(0)
          });
        }
      }
    }
    if (duplicateBlocks.length > 0) {
      issues.push(`Found ${duplicateBlocks.length} highly similar content blocks (possible duplication)`);
    }
    
    // Check 8: Paragraph Length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const avgSentencesPerPara = sentences.length / Math.max(paragraphs.length, 1);
    if (avgSentencesPerPara < 2) {
      warnings.push('Paragraphs may be too short - aim for 3-5 sentences per paragraph');
    }
    
    // Check 9: Look for off-topic content
    const offTopicPatterns = ['paddle board', 'kayak', 'completely unrelated', 'check out our store', 'contact us for'];
    for (const pattern of offTopicPatterns) {
      if (content.toLowerCase().includes(pattern)) {
        issues.push(`Off-topic content detected: "${pattern}"`);
      }
    }
    
    // Check 10: Formatting - look for proper headers
    const h2Count = (content.match(/^##\s+/gm) || []).length;
    if (h2Count < 5) {
      issues.push(`Not enough H2 sections: ${h2Count} (need at least 5-8)`);
    }
    
    // Check 11: CRITICAL - Generic/Weak Language Check
    const genericPhrases = [
      'explosion of flavors',
      'symphony of flavors',
      'perfect blend',
      'harmonious',
      'amazing',
      'incredible',
      'revolutionary',
      'life-changing',
      'game-changing',
      'in today\'s world',
      'as we all know',
      'this groundbreaking'
    ];
    const foundGenericPhrases = [];
    for (const phrase of genericPhrases) {
      if (content.toLowerCase().includes(phrase)) {
        foundGenericPhrases.push(phrase);
      }
    }
    if (foundGenericPhrases.length > 2) {
      issues.push(`Too much generic/marketing language: "${foundGenericPhrases.join('", "')}" - Replace with specific details`);
    }
    
    // Check 12: CRITICAL - Logical Consistency Check
    // Look for items with mismatched names and content (e.g., "Triple Turkey" with "ham" in description)
    const itemSections = content.match(/###\s+\d+\.\s+(.+?)(?=###|##(?!#)|$)/gs) || [];
    const logicalIssues = [];
    
    for (const section of itemSections) {
      const titleMatch = section.match(/###\s+\d+\.\s+(.+)/);
      if (titleMatch) {
        const itemTitle = titleMatch[1].toLowerCase();
        const itemContent = section.toLowerCase();
        
        // Check if main ingredient in title appears in content
        const mainWord = itemTitle.split(/\s+/)[0];
        
        // Special cases for logical consistency
        if (itemTitle.includes('triple turkey') && itemContent.includes('ham')) {
          logicalIssues.push('Triple Turkey item includes ham (should focus on turkey only)');
        }
        if (itemTitle.includes('bacon') && !itemContent.includes('bacon')) {
          logicalIssues.push(`"${itemTitle}" title mentions bacon but content doesn't`);
        }
      }
    }
    if (logicalIssues.length > 0) {
      issues.push(`Logical inconsistencies found: ${logicalIssues.join('; ')}`);
    }
    
    // Check 13: CRITICAL - Repetitive Ingredients Check
    // Flag if same ingredients appear in multiple items
    const ingredientPattern = /ingredients?:\s*(.+?)(?:\n|$)/gi;
    const allIngredients = [];
    let match;
    while ((match = ingredientPattern.exec(content)) !== null) {
      allIngredients.push(match[1].toLowerCase());
    }
    
    const commonIngredients = ['lettuce', 'tomato', 'bread', 'cheese', 'mayo'];
    const repetitionCount = {};
    
    for (const ingredient of commonIngredients) {
      let count = 0;
      for (const itemIngredients of allIngredients) {
        if (itemIngredients.includes(ingredient)) count++;
      }
      if (count > 5) { // If same ingredient appears in 5+ items
        repetitionCount[ingredient] = count;
      }
    }
    
    if (Object.keys(repetitionCount).length > 0) {
      const repeated = Object.entries(repetitionCount).map(([ing, count]) => `${ing} (${count} items)`).join(', ');
      warnings.push(`Highly repetitive ingredients detected: ${repeated} - Consider more variety in sandwich types`);
    }
    
    // Check 14: CRITICAL - Outline Format Check (artificial "Hook:" labels)
    if (content.match(/^\s*\*?Hook\*?:/gm) || content.match(/^\s*\*?Introduction\*?:/gm)) {
      issues.push('Content appears to be in outline format with labels (Hook:, Introduction:) - Should be natural prose format');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      metrics: {
        wordCount,
        h2Sections: h2Count,
        paragraphs: paragraphs.length,
        avgSentencesPerPara: avgSentencesPerPara.toFixed(1),
        metaDescriptionLength: metaLength,
        genericPhrasesFound: foundGenericPhrases.length,
        logicalInconsistencies: logicalIssues.length
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