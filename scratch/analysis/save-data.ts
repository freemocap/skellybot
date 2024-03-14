import * as fs from 'fs';

export const saveData = async (data: any, saveDirectory: string = '.') => {
  if (!fs.existsSync(saveDirectory)) {
    fs.mkdirSync(saveDirectory, { recursive: true });
  }
  console.log(`Saving data to files in ${saveDirectory}`);

  const jsonContent = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(`${saveDirectory}/server-data.json`, jsonContent);

  // const tomlContent = toml.stringify(data);
  // await fs.promises.writeFile(`${saveDirectory}/server-data.toml`, tomlContent);

  console.log(`Data saved to:  ${saveDirectory}`);
};
