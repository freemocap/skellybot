import json
import logging
import os
import pprint

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
                       json_schema_model: ExtractedTextData,
                       base_prompt_text: str = "",
                       max_input_tokens: int = 1.6e4,
                       llm_model: str = "gpt-4-turbo") -> BaseModel:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    encoding = tiktoken.encoding_for_model(llm_model)
    text_length_check = False
    while not text_length_check:
        num_tokens = len(encoding.encode(input_text))
        if num_tokens > max_input_tokens:
            logger.warning(f"Input text length {num_tokens} exceeds maximum tokens {max_input_tokens}. Truncating ...")
            input_text = input_text[:int(len(input_text) * 0.9)]
        else:
            text_length_check = True
    analyzer_prompt = construct_analyzer_prompt(json_schema_model=json_schema_model,
                                                input_text=input_text,
                                                base_prompt_text=base_prompt_text)

    logger.info(f"Sending chat completion request for {json_schema_model.__name__} with LLM model {llm_model} ...")
    logger.debug("Prompt: \n\n" + analyzer_prompt)

    response = await  openai_client.chat.completions.create(
        model=llm_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": analyzer_prompt},
        ],
        temperature=0.0,
    )

    logger.info(f"Chat completion response: {pprint.pformat(response.dict(), indent=2)}")

    ai_response = response.choices[0].message.content
    logger.info(f"AI response: {ai_response}")
    try:
        constructed_pydantic_model = json_schema_model(**json.loads(ai_response))
        return constructed_pydantic_model
    except Exception as e:
        logger.error(f"Error constructing Pydantic model: {e}")
        raise e


if __name__ == "__main__":
    from src.tests.test_extraction import TEST_STRING

    test_string = TEST_STRING
    from src.models.extract_text_data import ExtractedTextData

    constructed_pydantic_model_out = analyze_text(test_string, ExtractedTextData)
    logger.info(f"Constructed Pydantic model:\n\n{constructed_pydantic_model_out}")
