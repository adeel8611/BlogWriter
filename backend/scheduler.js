/**
 * Scheduled Crawling Service
 * Runs scheduled crawls based on configured intervals
 */

const adminCrawlingService = require('./modules/admin/admin.crawling.service');

/**
 * Process all due crawls
 */
async function processDueCrawls() {
  try {
    console.log('🔍 Checking for due crawls...');

    const dueCrawls = await adminCrawlingService.getDueCrawls();

    if (dueCrawls.length === 0) {
      console.log('✅ No crawls due at this time');
      return;
    }

    console.log(`📋 Found ${dueCrawls.length} crawls due`);

    const results = [];

    for (const crawl of dueCrawls) {
      try {
        console.log(`🔄 Crawling: ${crawl.project_name} (${crawl.website_url})`);

        const result = await adminCrawlingService.performImmediateCrawl(crawl.project_id);

        results.push({
          projectId: crawl.project_id,
          projectName: crawl.project_name,
          success: true,
          result
        });

        console.log(`✅ Successfully crawled: ${crawl.project_name}`);
      } catch (error) {
        console.error(`❌ Failed to crawl ${crawl.project_name}:`, error.message);

        results.push({
          projectId: crawl.project_id,
          projectName: crawl.project_name,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`📊 Crawling completed: ${results.filter(r => r.success).length}/${results.length} successful`);

    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('❌ Error processing due crawls:', error);
    throw error;
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('⏰ Starting scheduled crawling service...');
  console.log('📅 Running every 15 minutes to check for due crawls');

  // Check for due crawls every 15 minutes
  setInterval(() => {
    processDueCrawls().catch(err => {
      console.error('Scheduler error:', err);
    });
  }, 15 * 60 * 1000); // 15 minutes

  // Run once immediately on startup
  processDueCrawls().catch(err => {
    console.error('Initial crawl check error:', err);
  });
}

// Export for testing
module.exports = {
  processDueCrawls,
  startScheduler
};

// Start scheduler if run directly
if (require.main === module) {
  startScheduler();
}