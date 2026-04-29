const pool = require('../../database/connection');
const crawlerService = require('../crawler/crawler.service');

class AdminCrawlingService {
  /**
   * Create or update crawling schedule for a project
   */
  async updateCrawlingSchedule(projectId, scheduleType, intervalDays = 7) {
    try {
      const nextCrawlAt = this.calculateNextCrawl(scheduleType, intervalDays);

      const result = await pool.query(`
        INSERT INTO crawling_schedules (id, project_id, schedule_type, interval_days, next_crawl_at, active)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
        ON CONFLICT (project_id)
        DO UPDATE SET
          schedule_type = EXCLUDED.schedule_type,
          interval_days = EXCLUDED.interval_days,
          next_crawl_at = EXCLUDED.next_crawl_at,
          active = true,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [projectId, scheduleType, intervalDays, nextCrawlAt]);

      return result.rows[0];
    } catch (error) {
      console.error('Update crawling schedule error:', error);
      throw error;
    }
  }

  /**
   * Get crawling schedule for a project
   */
  async getCrawlingSchedule(projectId) {
    try {
      const result = await pool.query(
        'SELECT * FROM crawling_schedules WHERE project_id = $1',
        [projectId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Get crawling schedule error:', error);
      throw error;
    }
  }

  /**
   * Get all crawling schedules (admin only)
   */
  async getAllCrawlingSchedules() {
    try {
      const result = await pool.query(`
        SELECT cs.*, p.name as project_name, p.website_url, u.username as owner_username
        FROM crawling_schedules cs
        JOIN projects p ON cs.project_id = p.id
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY cs.created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Get all crawling schedules error:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate crawling schedule
   */
  async toggleCrawlingSchedule(scheduleId, active) {
    try {
      const result = await pool.query(`
        UPDATE crawling_schedules
        SET active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [active, scheduleId]);

      if (result.rows.length === 0) {
        throw new Error('Crawling schedule not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Toggle crawling schedule error:', error);
      throw error;
    }
  }

  /**
   * Delete crawling schedule
   */
  async deleteCrawlingSchedule(scheduleId) {
    try {
      const result = await pool.query(
        'DELETE FROM crawling_schedules WHERE id = $1 RETURNING id',
        [scheduleId]
      );

      if (result.rows.length === 0) {
        throw new Error('Crawling schedule not found');
      }

      return { success: true, message: 'Crawling schedule deleted successfully' };
    } catch (error) {
      console.error('Delete crawling schedule error:', error);
      throw error;
    }
  }

  /**
   * Perform immediate crawl (admin only)
   */
  async performImmediateCrawl(projectId) {
    try {
      // Get project info
      const projectResult = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectResult.rows[0];

      if (!project.website_url) {
        throw new Error('Project has no website URL configured');
      }

      // Perform crawl
      const crawlResult = await crawlerService.crawlWebsite(projectId, project.website_url);

      // Update last crawled timestamp
      await pool.query(`
        UPDATE crawling_schedules
        SET last_crawled_at = CURRENT_TIMESTAMP,
            next_crawl_at = CASE
              WHEN schedule_type = 'immediate' THEN NULL
              WHEN schedule_type = 'daily' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
              WHEN schedule_type = 'weekly' THEN CURRENT_TIMESTAMP + INTERVAL '7 days'
              WHEN schedule_type = 'monthly' THEN CURRENT_TIMESTAMP + INTERVAL '30 days'
            END
        WHERE project_id = $1
      `, [projectId]);

      return crawlResult;
    } catch (error) {
      console.error('Perform immediate crawl error:', error);
      throw error;
    }
  }

  /**
   * Get due crawls (admin only - for cron job)
   */
  async getDueCrawls() {
    try {
      const result = await pool.query(`
        SELECT cs.*, p.name as project_name, p.website_url
        FROM crawling_schedules cs
        JOIN projects p ON cs.project_id = p.id
        WHERE cs.active = true
          AND cs.next_crawl_at IS NOT NULL
          AND cs.next_crawl_at <= CURRENT_TIMESTAMP
          AND (cs.last_crawled_at IS NULL OR cs.last_crawled_at < CURRENT_TIMESTAMP - INTERVAL '1 hour')
        ORDER BY cs.next_crawl_at ASC
      `);

      return result.rows;
    } catch (error) {
      console.error('Get due crawls error:', error);
      throw error;
    }
  }

  /**
   * Calculate next crawl date based on schedule type
   */
  calculateNextCrawl(scheduleType, intervalDays = 7) {
    const now = new Date();

    switch (scheduleType) {
      case 'immediate':
        return null; // No next crawl scheduled
      case 'daily':
        now.setDate(now.getDate() + 1);
        return now;
      case 'weekly':
        now.setDate(now.getDate() + (intervalDays || 7));
        return now;
      case 'monthly':
        now.setDate(now.getDate() + 30);
        return now;
      default:
        return null;
    }
  }

  /**
   * Get crawling statistics (admin only)
   */
  async getCrawlingStats() {
    try {
      const [totalResult, activeResult, dueResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM crawling_schedules'),
        pool.query('SELECT COUNT(*) as count FROM crawling_schedules WHERE active = true'),
        pool.query('SELECT COUNT(*) as count FROM crawling_schedules WHERE active = true AND next_crawl_at <= CURRENT_TIMESTAMP')
      ]);

      return {
        total: parseInt(totalResult.rows[0].count),
        active: parseInt(activeResult.rows[0].count),
        due: parseInt(dueResult.rows[0].count)
      };
    } catch (error) {
      console.error('Get crawling stats error:', error);
      throw error;
    }
  }
}

module.exports = new AdminCrawlingService();