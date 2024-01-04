import * as ts from 'typescript';
import * as fs from 'fs';
import * as toml from '@iarna/toml';

function extractArchitecture(filePath: string): any {
  console.log(`Starting to extract architecture from: ${filePath}`);

  // Read and parse the file
  console.log(`Reading and parsing file: ${filePath}`);
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath).toString(),
    ts.ScriptTarget.Latest,
    true,
  );

  console.log('File successfully read and parsed.');

  // Define the structure to hold your architecture
  console.log('Defining structure to hold architecture.');
  const architecture = {
    modules: [],
    services: [],
    // Add other architectural elements as needed
  };

  console.log('Structure defined successfully.');

  // Traverse the AST and extract information
  function analyzeNode(node: ts.Node) {
    console.log(`Analyzing node of kind: ${ts.SyntaxKind[node.kind]}`);

    if (ts.isClassDeclaration(node)) {
      console.log(`Found class: ${node.name?.text}`);
      // @ts-ignore
      const decorators = (node as ts.ClassDeclaration).decorators;
      for (const decorator of decorators || []) {
        const decoratorExpr = decorator.expression;
        let decoratorName;
        // Handle call expressions within decorators
        if (ts.isCallExpression(decoratorExpr)) {
          decoratorName = decoratorExpr.expression.getText();
        } else {
          decoratorName = decoratorExpr.getText();
        }

        console.log(`Found decorator: ${decoratorName}`);
        if (decoratorName === '@Module') {
          const moduleDetails = { name: node.name?.getText() };
          architecture.modules.push(moduleDetails);
          console.log(`Module added: ${moduleDetails.name}`);
        } else if (decoratorName === '@Service') {
          const serviceDetails = { name: node.name?.getText() };
          architecture.services.push(serviceDetails);
          console.log(`Service added: ${serviceDetails.name}`);
        }
      }
    } else {
      console.log(
        `Skipping non-class node of kind: ${ts.SyntaxKind[node.kind]}`,
      );
    }

    ts.forEachChild(node, analyzeNode);
  }

  console.log('Starting to analyze source file.');
  analyzeNode(sourceFile);
  console.log('Source file analysis completed.');

  console.log('Returning extracted architecture.');
  return architecture;
}

// Example usage:
console.log('Starting to extract architecture.');
const architecture = extractArchitecture(
  'C:/Users/jonma/github_repos/freemocap_organization/skellybot/src/main/main.module.ts',
);
console.log('Architecture extraction completed.');

// Save to JSON
console.log('Saving architecture to JSON file.');
fs.writeFileSync('architecture.json', JSON.stringify(architecture, null, 2));
console.log('Architecture saved to JSON file.');

// Save to TOML
console.log('Saving architecture to TOML file.');
fs.writeFileSync('architecture.toml', toml.stringify(architecture));
console.log('Architecture saved to TOML file.');

console.log('All tasks completed successfully.');
