/**
 * @type {import('../shared/custom-provider').CustomFinderDefinition}
 */
module.exports = {
  fuzzyAdapterType: "custom.python.snippets",

  backend: {
    async querySelectableOptions() {
      return [
        {
          id: "hello_world",
          title: "Hello World",
          description: "Print básico em Python",
          code: `def main():
    print("Hello, world!")

if __name__ == "__main__":
    main()
`,
        },
        {
          id: "factorial",
          title: "Factorial",
          description: "Cálculo de fatorial",
          code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
`,
        },
        {
          id: "http_request",
          title: "HTTP Request",
          description: "Requisição HTTP com requests",
          code: `import requests

response = requests.get("https://api.github.com")
print(response.status_code)
print(response.json())
`,
        },
      ];
    },

    async onSelect(itemPath) {
      console.log("hello world");
      return {
        path: itemPath,
        action: "none",
      };
    },

    async getPreviewData(identifier) {
      return {
        content: identifier.code,
        language: "python",
      };
    },
  },

  ui: {
    dataAdapter: {
      parseOptions(data) {
        return data.map((snippet) => ({
          id: snippet.id,
          title: snippet.title,
          description: snippet.description,
          code: snippet.code,
        }));
      },

      getDisplayText(option) {
        return `${option.title}\n${option.description}`;
      },

      getSelectionValue(option) {
        return option;
      },

      filterOption(option, query) {
        const q = query.toLowerCase();
        return (
          option.title.toLowerCase().includes(q) ||
          option.description.toLowerCase().includes(q) ||
          option.code.toLowerCase().includes(q)
        );
      },
    },
  },
};
