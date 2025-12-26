/**
 * @type {import('./custom-provider').CustomFinderDefinition}
 */
module.exports = {
  fuzzyAdapterType: "custom.database.queries",
  previewAdapterType: "preview.codeHighlighted",

  backend: {
    async querySelectableOptions() {
      return [
        {
          id: "active_users",
          name: "Active Users",
          description: "List all active users",
          dialect: "postgres",
          query: `
SELECT
  u.id,
  u.email,
  u.created_at
FROM users u
WHERE u.active = true
ORDER BY u.created_at DESC;
          `.trim()
        },
        {
          id: "monthly_revenue",
          name: "Monthly Revenue",
          description: "Revenue grouped by month",
          dialect: "postgres",
          query: `
SELECT
  DATE_TRUNC('month', paid_at) AS month,
  SUM(amount) AS total
FROM payments
WHERE status = 'paid'
GROUP BY month
ORDER BY month DESC;
          `.trim()
        }
      ];
    },

    async onSelect(item) {
      return {
        action: "copyQueryToClipboard",
        data: {
          id: item.id,
          query: item.query
        }
      };
    },

    async getPreviewData(item) {
      console.log("item ", item);
      return {
        language: "sql",
        content: item.query
      };
    }
  },

  ui: {
    dataAdapter: {
      parseOptions(data) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          dialect: row.dialect,
          query: row.query
        }));
      },

      getDisplayText(option) {
        return `🗄️ ${option.name}
${option.description}`;
      },

      getSelectionValue(option) {
        return option;
      },

      filterOption(option, query) {
        const q = query.toLowerCase();
        return (
          option.name.toLowerCase().includes(q) ||
          option.description.toLowerCase().includes(q) ||
          option.query.toLowerCase().includes(q)
        );
      }
    }
  }
};
