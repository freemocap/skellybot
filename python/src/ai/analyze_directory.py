import asyncio
from pathlib import Path
from typing import Type

from pydantic import BaseModel

from src.ai.analyze_text import logger, analyze_text
from src.models.extract_text_data import ExtractedTextData


async def analyze_directory(input_directory: str,
                            output_directory: str,
                            json_schema_model: Type[BaseModel],
                            base_prompt_text: str,
                            max_file_count: int = None,
                            llm_model: str = "gpt-3.5-turbo"):
    input_directory_path = Path(input_directory)
    output_directory_path = Path(output_directory)
    output_directory_path.mkdir(parents=True, exist_ok=True)

    if not input_directory_path.exists():
        raise FileNotFoundError(f"Directory not found: {input_directory_path}")
    logger.info(f"Analyzing directory: {input_directory_path}")
    tasks = []


    for file_number, file in enumerate(input_directory_path.rglob('*.md')):
        if max_file_count and file_number >= max_file_count:
            break
        tasks.append(analyze_markdown_file(base_prompt_text, file, input_directory_path, json_schema_model, llm_model,
                                           output_directory_path))

    logger.info(f"Starting analysis of {len(tasks)} files in directory: {input_directory_path}")
    await asyncio.gather(*tasks)
    logger.info(f"Analysis complete for directory: {input_directory_path}")


async def analyze_markdown_file(base_prompt_text: str,
                                file_path: Path,
                                input_directory_path: Path,
                                json_schema_model: ExtractedTextData,
                                llm_model: str,
                                output_directory_path: Path):
    logger.debug(f"Analyzing file: {file_path}")
    try:
        input_file_text = file_path.read_text(encoding='utf-8')
        file_parent_path = file_path.parent
        output_parent_path = output_directory_path / file_parent_path.relative_to(input_directory_path)
        output_parent_path.mkdir(parents=True, exist_ok=True)
        constructed_pydantic_model = await analyze_text(input_text=input_file_text,
                                                        json_schema_model=json_schema_model,
                                                        base_prompt_text=base_prompt_text,
                                                        llm_model=llm_model)
        logger.info(f"Constructed Pydantic model:\n\n{constructed_pydantic_model}")

        output_markdown_string = str(constructed_pydantic_model)
        full_output_string = output_markdown_string + "\n\nOriginal text:\n\n```\n\n" + input_file_text + "\n\n``` \n\n"
        output_file_name = constructed_pydantic_model.filename
        save_path = output_parent_path / output_file_name

        save_path.write_text(full_output_string, encoding='utf-8')
        logger.info(f"Saved Pydantic model as JSON: {str(save_path)}")
    except Exception as e:
        logger.error(f"Error analyzing file: {file_path}")
        logger.error(e)
        raise e


if __name__ == "__main__":
    from src.models.extract_text_data import ExtractedTextData

    input_directory_out = r"C:\Users\jonma\Sync\skellybot-data\markdown\2024_NEU_Capstone"
    output_directory_out = r"C:\Users\jonma\Sync\skellybot-data\markdown\2024_NEU_Capstone_AI_Processed"
    classbot_prompt_file = r"C:\Users\jonma\Sync\skellybot-data\markdown\classbot_prompt.txt"

    with open(classbot_prompt_file, 'r', encoding='utf-8') as f:
        classbot_prompt = f.read()

    asyncio.run(analyze_directory(input_directory=input_directory_out,
                                  output_directory=output_directory_out,
                                  json_schema_model=ExtractedTextData,
                                  base_prompt_text=classbot_prompt))

    logger.info(f"Analysis complete for directory: {input_directory_out}")
