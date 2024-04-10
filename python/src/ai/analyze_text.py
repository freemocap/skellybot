import json
import pprint
from typing import Type

from pydantic import BaseModel

from src.ai.construct_prompt import construct_analyzer_prompt
from openai import OpenAI
from dotenv import load_dotenv
import os
import logging


logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logger.setLevel(logging.DEBUG)
    logger.addHandler(logging.StreamHandler())

load_dotenv("../../env.analysis")

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("Please set OPENAI_API_KEY in your .env file")
openai_client = OpenAI(api_key=OPENAI_API_KEY)
def analyze_text(input_text: str, pydantic_model: BaseModel, llm_model:str="gpt-4-turbo") -> BaseModel:

    analyzer_prompt = construct_analyzer_prompt(pydantic_model, input_text)
    logger.info(f"Sending chat completion request for {pydantic_model.__name__} with LLM model {llm_model} ...")
    logger.debug("Prompt: \n\n" + analyzer_prompt)
    response = openai_client.chat.completions.create(
        model=llm_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": analyzer_prompt},
        ]
    )

    logger.info(f"Chat completion response: {pprint.pformat(response, indent=2)}")

    ai_response = response.choices[0].message.content
    logger.info(f"AI response: {ai_response}")
    try:
        constructed_pydantic_model = pydantic_model(**json.loads(ai_response))
        return constructed_pydantic_model
    except Exception as e:
        logger.error(f"Error constructing Pydantic model: {e}")
        raise e


if __name__ == "__main__":
    from src.tests.test_extraction import TEST_STRING
    test_string = TEST_STRING
    from src.models.extraction import ExtractedTextData

    constructed_pydantic_model = analyze_text(test_string, ExtractedTextData)
    logger.info(f"Constructed Pydantic model:\n\n{constructed_pydantic_model}")
