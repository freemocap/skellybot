import json
import logging
import os
import pprint
from typing import Type

import tiktoken
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel

from src.ai.construct_prompt import construct_analyzer_prompt
from src.configure_logging import configure_logging

from src.models.extract_text_data import ExtractedTextData
configure_logging()
logger = logging.getLogger(__name__)

load_dotenv("../../env.analysis")

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("Please set OPENAI_API_KEY in your .env file")


async def analyze_text(input_text: str,
                       json_schema_model: Type[ExtractedTextData],
                       base_prompt_text: str = "",
                       max_input_tokens: int = 1.6e4,
                       llm_model: str = "gpt-4o-mini") -> BaseModel:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    encoding = tiktoken.encoding_for_model(llm_model)
    text_length_check = False
    while not text_length_check:
        analyzer_prompt = construct_analyzer_prompt(json_schema_model=json_schema_model,
                                                    input_text=input_text.replace('{', '-').replace('}', '-'),
                                                    base_prompt_text=base_prompt_text)
        num_tokens = len(encoding.encode(analyzer_prompt))
        if num_tokens > max_input_tokens:
            logger.warning(f"Input text length {num_tokens} exceeds maximum tokens {max_input_tokens}. Truncating ...")
            input_text = input_text[:int(len(input_text) * 0.9)]
        else:
            text_length_check = True


    logger.info(f"Sending chat completion request for {json_schema_model.__name__} with LLM model {llm_model} ...")
    logger.debug("Prompt: \n\n" + analyzer_prompt)

    response = await get_ai_response(analyzer_prompt, llm_model, openai_client)

    ai_response = response.choices[0].message.content
    logger.info(f"AI response: {ai_response}")
    try:
        constructed_pydantic_model = json_schema_model(**json.loads(ai_response))
        return constructed_pydantic_model
    except json.decoder.JSONDecodeError as e:
        error_string = f"\n\n ------- \n\nThis output could not be parsed as JSON:\n\n {ai_response} \n\n due to error: {e}, please fix!"

        logger.warning(f"Error occurred parsing JSON: {e}. Sending error message to LLM with prompt: \n\n'''{error_string}'''")
        response = await get_ai_response(analyzer_prompt+error_string, llm_model, openai_client)
        ai_response = response.choices[0].message.content
        logger.info(f"Corrected AI response: {ai_response}")
        try:
            constructed_pydantic_model = json_schema_model(**json.loads(ai_response))
            return constructed_pydantic_model
        except json.decoder.JSONDecodeError as e:
            logger.error(f"Error parsing JSON after correction: {e}")
            return
    except Exception as e:
        logger.error(f"Error constructing Pydantic model: {e}")
        raise e


async def fix_json_parsing_error(error_string, openai_client, llm_model, json_schema_model):


    second_response = await  openai_client.chat.completions.create(
        model=llm_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": error_string},
        ],
        temperature=0.0,
    )
    constructed_pydantic_model = json_schema_model(**json.loads(second_response))
    return constructed_pydantic_model


async def get_ai_response(analyzer_prompt, llm_model, openai_client):
    try:
        response = await  openai_client.chat.completions.create(
            model=llm_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": analyzer_prompt},
            ],
            temperature=0.0,
        )
    except Exception as e:
        logger.error(f"Error sending chat completion request: {e}")
        raise e
    logger.info(f"Chat completion response: {pprint.pformat(response.dict(), indent=2)}")
    return response


if __name__ == "__main__":
    from src.tests.test_extraction import TEST_STRING
    test_string = TEST_STRING

    constructed_pydantic_model_out = analyze_text(test_string, ExtractedTextData)
    logger.info(f"Constructed Pydantic model:\n\n{constructed_pydantic_model_out}")
