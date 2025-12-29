/**
 * @type {import('../shared/custom-provider').CustomFinderDefinition}
 */
module.exports = {
  fuzzyAdapterType: "custom.github.issues",

  backend: {
    async querySelectableOptions() {
      const issues = [
        {
          id: 101,
          title: "Fix memory leak in WebviewAssetManager",
          author: "guichina",
          status: "open",
          labels: ["bug", "performance"],
          assignee: "guichina",
          updatedAt: "2025-01-10",
          body: "Memory usage keeps growing after reopening the panel.",
        },
        {
          id: 102,
          title: "Add dynamic custom provider loader",
          author: "gemini",
          status: "closed",
          labels: ["feature", "architecture"],
          assignee: "gemini",
          updatedAt: "2025-01-08",
          body: "Implements file watching and hot reload for providers.",
        },
        {
          id: 103,
          title: "Refactor command registration flow",
          author: "guichina",
          status: "open",
          labels: ["refactor"],
          assignee: null,
          updatedAt: "2025-01-06",
          body: "Commands should be registered only once in activate().",
        },
      ];
      return issues;
    },

    async onSelect(issuePath) {
      return {
        action: "openFile",
        path: issuePath
      }
    },

    async getPreviewData(issueId) {
      return {
        language: "markdown",
        content: `
# Issue #${issueId}

**Status:** ${issueId === 102 ? "Closed" : "Open"}

---

### Description
${issueId === 102
            ? "Implements hot reload for custom providers."
            : "Issue description not found."}

---

### Metadata
- Repository: **code-telescope**
- Source: GitHub
        `,
      };
    },
  },

  ui: {
    dataAdapter: {
      parseOptions(data) {
        return data.map((issue) => ({
          id: issue.id,
          title: issue.title,
          author: issue.author,
          status: issue.status,
          labels: issue.labels,
          assignee: issue.assignee ?? "unassigned",
          updatedAt: issue.updatedAt,
        }));
      },

      getDisplayText(option) {
        const statusIcon = option.status === "open" ? "🟢" : "🔴";
        const labels = option.labels.map((l) => `#${l}`).join(" ");

        return `${statusIcon} ${option.title}
by ${option.author} • ${labels}`;
      },

      getSelectionValue(option) {
        return option.id.toString();
      },

      filterOption(option, query) {
        const q = query.toLowerCase();

        return (
          option.title.toLowerCase().includes(q) ||
          option.author.toLowerCase().includes(q) ||
          option.labels.some((l) => l.includes(q)) ||
          option.assignee.toLowerCase().includes(q)
        );
      },
    },
  },
};
