const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

// Google Chat Webhook URL
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL || "https://chat.googleapis.com/v1/spaces/AAAArEArY9U/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=weIU9CgMrO4yfbgJyOZ_4wfy-sTns7NT8-u09zRkfcM";

// Email configuration
const EMAIL_CONFIG = {
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'josh@medscafe.com',
      pass: process.env.EMAIL_PASSWORD || 'unee agfe muiv secl'
    }
  },
  from: process.env.EMAIL_USER || 'josh@medscafe.com',
  to: {
    managers: process.env.MANAGER_EMAILS?.split(',') || ['josh@medscafe.com'],
    executives: process.env.EXECUTIVE_EMAILS?.split(',') || ['josh@medscafe.com']
  }
};

// Store streak tracking file
const STREAK_FILE = 'store-streak.json';

class SalesReporter {
  constructor() {
    this.stores = [
      'cheboygan', 'lowell', 'alpena', 'gaylord', 'rc', 'manistee'
    ];
  }

  // Load streak data
  loadStreakData() {
    try {
      if (fs.existsSync(STREAK_FILE)) {
        return JSON.parse(fs.readFileSync(STREAK_FILE, 'utf8'));
      }
    } catch (error) {
      console.log('No existing streak data found');
    }
    return { currentTopStore: null, streakDays: 0, lastUpdate: null };
  }

  // Save streak data
  saveStreakData(data) {
    fs.writeFileSync(STREAK_FILE, JSON.stringify(data, null, 2));
  }

  // Load today's sales data from CSV files
  loadTodaySales() {
    const today = new Date().toISOString().split('T')[0];
    const sales = {};

    for (const store of this.stores) {
      const csvPath = path.join(__dirname, `treez-${store}.csv`);
      if (fs.existsSync(csvPath)) {
        try {
          const csvContent = fs.readFileSync(csvPath, 'utf8');
          const lines = csvContent.split('\n');
          if (lines.length > 1) {
            const salesAmount = parseFloat(lines[1].split(',')[1]);
            sales[store] = salesAmount;
          }
        } catch (error) {
          console.log(`Error reading ${store} CSV:`, error.message);
          sales[store] = 0;
        }
      } else {
        sales[store] = 0;
      }
    }

    return sales;
  }

  // Generate 4:20 PM report
  generate420Report() {
    const sales = this.loadTodaySales();
    const sortedStores = Object.entries(sales)
      .sort(([,a], [,b]) => b - a)
      .map(([store, amount], index) => ({
        rank: index + 1,
        store: this.formatStoreName(store),
        sales: amount,
        formatted: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }));

    const totalSales = Object.values(sales).reduce((sum, amount) => sum + amount, 0);
    const topStore = sortedStores[0];

    const message = {
      cards: [{
        header: {
          title: "🔥 MedsCafe 4:20 PM Sales Report 🔥",
          subtitle: new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        },
        sections: [
          {
            widgets: [{
              keyValue: {
                topLabel: "🏆 Top Performer",
                content: `${topStore.store}`,
                contentMultiline: true,
                bottomLabel: `${topStore.formatted}`,
                icon: "STAR"
              }
            }]
          },
          {
            widgets: [{
              keyValue: {
                topLabel: "💰 Total Sales",
                content: `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: "MONEY"
              }
            }]
          },
          {
            widgets: [{
              buttons: [{
                textButton: {
                  text: "📊 View Full Rankings",
                  onClick: {
                    openLink: {
                      url: "https://drive.google.com/drive/folders/your-folder-id"
                    }
                  }
                }
              }]
            }]
          }
        ]
      }]
    };

    // Add store rankings
    const rankingSection = {
      widgets: [{
        textParagraph: {
          text: `<b>📈 Store Rankings:</b>`
        }
      }]
    };

    sortedStores.forEach((store, index) => {
      const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
      rankingSection.widgets.push({
        textParagraph: {
          text: `${emoji} <b>${store.rank}.</b> ${store.store}: <b>${store.formatted}</b>`
        }
      });
    });

    message.cards[0].sections.push(rankingSection);

    return message;
  }

  // Generate 9:15 PM final report
  generate915Report() {
    const sales = this.loadTodaySales();
    const sortedStores = Object.entries(sales)
      .sort(([,a], [,b]) => b - a)
      .map(([store, amount], index) => ({
        rank: index + 1,
        store: this.formatStoreName(store),
        sales: amount,
        formatted: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }));

    const totalSales = Object.values(sales).reduce((sum, amount) => sum + amount, 0);
    const topStore = sortedStores[0];

    // Update streak data
    const streakData = this.loadStreakData();
    const today = new Date().toISOString().split('T')[0];
    
    if (streakData.currentTopStore === topStore.store) {
      streakData.streakDays++;
    } else {
      streakData.currentTopStore = topStore.store;
      streakData.streakDays = 1;
    }
    streakData.lastUpdate = today;
    this.saveStreakData(streakData);

    const message = {
      cards: [{
        header: {
          title: "🏁 MedsCafe Daily Final Report 🏁",
          subtitle: new Date().toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          imageUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
        },
        sections: [
          {
            widgets: [{
              keyValue: {
                topLabel: "🏆 Daily Champion",
                content: `${topStore.store}`,
                contentMultiline: true,
                bottomLabel: `${topStore.formatted}`,
                icon: "STAR"
              }
            }]
          },
          {
            widgets: [{
              keyValue: {
                topLabel: "🔥 Streak",
                content: `${streakData.streakDays} day${streakData.streakDays > 1 ? 's' : ''}`,
                bottomLabel: `${topStore.store} on top`,
                icon: "FLAME"
              }
            }]
          },
          {
            widgets: [{
              keyValue: {
                topLabel: "💰 Total Daily Sales",
                content: `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: "MONEY"
              }
            }]
          },
          {
            widgets: [{
              buttons: [{
                textButton: {
                  text: "📊 View Full Report",
                  onClick: {
                    openLink: {
                      url: "https://drive.google.com/drive/folders/your-folder-id"
                    }
                  }
                }
              }]
            }]
          }
        ]
      }]
    };

    // Add final rankings
    const rankingSection = {
      widgets: [{
        textParagraph: {
          text: `<b>📈 Final Daily Rankings:</b>`
        }
      }]
    };

    sortedStores.forEach((store, index) => {
      const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
      rankingSection.widgets.push({
        textParagraph: {
          text: `${emoji} <b>${store.rank}.</b> ${store.store}: <b>${store.formatted}</b>`
        }
      });
    });

    message.cards[0].sections.push(rankingSection);

    return message;
  }

  // Format store names
  formatStoreName(store) {
    const names = {
      'cheboygan': 'Cheboygan',
      'lowell': 'Lowell',
      'alpena': 'Alpena',
      'gaylord': 'Gaylord',
      'rc': 'Rogers City',
      'manistee': 'Manistee'
    };
    return names[store] || store;
  }

  // Send Google Chat message
  async sendGoogleChatMessage(message) {
    try {
      const response = await fetch(GOOGLE_CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('✅ Google Chat message sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send Google Chat message:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending Google Chat message:', error.message);
      return false;
    }
  }

  // Generate email HTML
  generateEmailHTML(reportType, sales, streakData) {
    const sortedStores = Object.entries(sales)
      .sort(([,a], [,b]) => b - a)
      .map(([store, amount], index) => ({
        rank: index + 1,
        store: this.formatStoreName(store),
        sales: amount,
        formatted: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }));

    const totalSales = Object.values(sales).reduce((sum, amount) => sum + amount, 0);
    const topStore = sortedStores[0];

    const isFinalReport = reportType === '915';
    const title = isFinalReport ? 'Daily Final Report' : '4:20 PM Update';
    const streakInfo = isFinalReport ? `<p><strong>🔥 Streak:</strong> ${streakData.currentTopStore} has been on top for ${streakData.streakDays} day${streakData.streakDays > 1 ? 's' : ''}</p>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .title { color: #2c3e50; font-size: 28px; margin-bottom: 10px; }
          .subtitle { color: #7f8c8d; font-size: 16px; }
          .stats { display: flex; justify-content: space-around; margin: 30px 0; }
          .stat { text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #27ae60; }
          .stat-label { color: #7f8c8d; font-size: 14px; }
          .rankings { margin: 30px 0; }
          .ranking-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ecf0f1; }
          .rank { font-weight: bold; color: #2c3e50; }
          .store { color: #34495e; }
          .sales { font-weight: bold; color: #27ae60; }
          .top-store { background-color: #fff3cd; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">🏆 MedsCafe ${title}</div>
            <div class="subtitle">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="stat-label">Total Sales</div>
            </div>
            <div class="stat">
              <div class="stat-value">${topStore.store}</div>
              <div class="stat-label">Top Performer</div>
            </div>
          </div>

          ${streakInfo}

          <div class="rankings">
            <h3>📈 Store Rankings</h3>
            ${sortedStores.map((store, index) => `
              <div class="ranking-item ${index === 0 ? 'top-store' : ''}">
                <div class="rank">${index + 1}. ${store.store}</div>
                <div class="sales">${store.formatted}</div>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>This report was automatically generated by the MedsCafe Sales Data Collection System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send email report
  async sendEmailReport(reportType) {
    const sales = this.loadTodaySales();
    const streakData = this.loadStreakData();
    const htmlContent = this.generateEmailHTML(reportType, sales, streakData);
    const subject = reportType === '915' ? 'MedsCafe Daily Final Report' : 'MedsCafe 4:20 PM Update';

    // For now, we'll use a simple email service
    // You can integrate with SendGrid, AWS SES, or other email services
    console.log('📧 Email report generated:', subject);
    console.log('HTML content length:', htmlContent.length);
    
    // TODO: Implement actual email sending
    // This would typically use nodemailer or similar
    return true;
  }

  // Run 4:20 PM report
  async run420Report() {
    console.log('📊 Generating 4:20 PM report...');
    
    const message = this.generate420Report();
    await this.sendGoogleChatMessage(message);
    
    console.log('✅ 4:20 PM report completed');
  }

  // Run 9:15 PM final report
  async run915Report() {
    console.log('📊 Generating 9:15 PM final report...');
    
    const message = this.generate915Report();
    await this.sendGoogleChatMessage(message);
    
    // Send email reports
    await this.sendEmailReport('915');
    
    console.log('✅ 9:15 PM final report completed');
  }
}

module.exports = SalesReporter; 