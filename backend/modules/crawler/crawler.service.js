const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const ragService = require('../rag/rag.service');

class CrawlerService {
  /**
   * Crawl a website and extract meaningful content
   */
  async crawlWebsite(projectId, websiteUrl) {
    try {
      console.log(`Starting crawl for: ${websiteUrl}`);

      // Validate URL
      new URL(websiteUrl);

      // Fetch the main page
      const response = await axios.get(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlogWriter/1.0)'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Extract main content
      const content = this.extractContent($);

      // Extract additional links to crawl (limit to 5 for MVP)
      const links = this.extractLinks($, websiteUrl).slice(0, 5);

      // Crawl additional pages
      for (const link of links) {
        try {
          console.log(`Crawling: ${link}`);
          const pageResponse = await axios.get(link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BlogWriter/1.0)'
            },
            timeout: 10000
          });
          const page$ = cheerio.load(pageResponse.data);
          content.push(this.extractContent(page$));
        } catch (error) {
          console.warn(`Failed to crawl ${link}:`, error.message);
        }
      }

      // Flatten and combine content
      const allContent = content.flat().join('\n\n');

      // Chunk the content and store in RAG
      const chunks = this.chunkText(allContent, 1000);
      console.log(`Extracted ${chunks.length} chunks from website`);

      for (const chunk of chunks) {
        await ragService.storeDocument(projectId, chunk, 'crawl', {
          source_url: websiteUrl,
          crawled_at: new Date().toISOString()
        });
      }

      return {
        success: true,
        chunksStored: chunks.length,
        message: `Successfully crawled and stored ${chunks.length} content chunks`
      };
    } catch (error) {
      console.error('Crawl error:', error);
      throw new Error(`Crawling failed: ${error.message}`);
    }
  }

  /**
   * Extract meaningful content from HTML
   */
  extractContent($) {
    const content = [];

    // Remove unwanted elements
    $('nav, header, footer, script, style, iframe, noscript, .ad, .advertisement').remove();

    // Extract text from main content areas
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'p'
    ];

    selectors.forEach(selector => {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 100) { // Only include substantial content
          content.push(text);
        }
      });
    });

    return content;
  }

  /**
   * Extract links from the page
   */
  extractLinks($, baseUrl) {
    const links = [];
    const baseDomain = new URL(baseUrl).hostname;

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        const linkDomain = new URL(absoluteUrl).hostname;

        // Only include links from the same domain
        if (linkDomain === baseDomain && !links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return links;
  }

  /**
   * Chunk text into smaller pieces
   */
  chunkText(text, chunkSize = 1000) {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

module.exports = new CrawlerService();
