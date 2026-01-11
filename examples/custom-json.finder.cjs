const fs = require('fs');
const path = require('path');

function findJsonFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file === 'node_modules' || file.startsWith('.')) {
          continue;
        }
        findJsonFiles(filePath, fileList);
      } else if (file.endsWith('.ts')) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return fileList;
}

function getRelativePath(filePath, workspaceRoot) {
  return path.relative(workspaceRoot, filePath);
}

/**
 * @type {import('../shared/custom-provider').CustomFinderDefinition}
 */
module.exports = {
  fuzzyAdapterType: "custom.json.files",

  backend: {
    async querySelectableOptions() {
      // Get workspace root (passed via environment or default to cwd)
      const workspaceRoot = process.cwd();

      // Find all SQL files
      const sqlFiles = findJsonFiles(workspaceRoot);

      // Read and parse each file
      const queries = [];

      for (const filePath of sqlFiles) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const relativePath = getRelativePath(filePath, workspaceRoot);

          // Extract filename without extension as fallback name
          const filename = path.basename(filePath, '.sql');

          queries.push({
            id: filePath,
            absolutePath: filePath,
            relativePath: relativePath,
            content: content,
            size: content.length,
            lines: content.split('\n').length
          });
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }
      }

      return queries;
    },

    async onSelect(item) {
      const selectedQuery = JSON.parse(item);
      console.log("query: ", selectedQuery)

      // Return the file path to be opened
      return {
        path: selectedQuery.absolutePath,
        action: "openFile"
      };
    },

    async getPreviewData(item) {
      const selectedQuery = JSON.parse(item);

      return {
        content: selectedQuery.content,
        language: "sql"
      };
    }
  },

  ui: {
    dataAdapter: {
      parseOptions(data) {
        return data;
      },

      getDisplayText(option) {
        return option.relativePath.padEnd(45);
      },

      getSelectionValue(option) {
        // Serialize the entire option for backend use
        return JSON.stringify({
          absolutePath: option.absolutePath,
          relativePath: option.relativePath,
          content: option.content,
          lines: option.lines
        });
      },

      filterOption(option, query) {
        const q = query.toLowerCase();
        return (
          option.relativePath.toLowerCase().includes(q) ||
          option.content.toLowerCase().includes(q)
        );
      }
    }
  }
};