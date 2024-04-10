from typing import Union

from pydantic import BaseModel, Field
import logging
logger = logging.getLogger(__name__)

BASE_PROMPT = "Use the provided INPUT TEXT to construct a JSON object based on the following schema:\n\n"
SANDWICH_CAPPER = "Remember! You instructions are to: \n\n"

def construct_analyzer_prompt(pydantic_model: BaseModel,
                              input_text: str) -> str:

    logger.info(f"Constructing prompt for {pydantic_model.__name__}")
    analyzer_prompt = BASE_PROMPT + "\n\n"
    json_schema_prompt = ""

    json_schema_prompt += "BEGIN JSON OBJECT SCHEMA\n\n"
    json_schema_prompt += construct_json_prompt(pydantic_model) + "\n\n"
    json_schema_prompt += "END JSON OBJECT SCHEMA\n\n"

    analyzer_prompt += json_schema_prompt

    input_text_prompt_string = f"BEGIN INPUT TEXT: \n\n{input_text}\n\n END INPUT TEXT\n\n"
    analyzer_prompt += input_text_prompt_string

    sandwich_cap_prompt = f"{SANDWICH_CAPPER} \n\n {BASE_PROMPT} \n\n {json_schema_prompt}"
    analyzer_prompt += sandwich_cap_prompt

    logger.info(f"Prompt constructed for {pydantic_model.__name__} with input text \n\n====================\n\n{input_text}\n\n====================\n\n")

    return analyzer_prompt


def construct_json_prompt(pydantic_model: BaseModel) -> str:
    """
    Constructs a prompt for JSON mode from a Pydantic model.

    Args:
    model (BaseModel): The Pydantic model to construct the prompt from.

    Returns:
    str: The constructed prompt.
    """
    fields = pydantic_model.__fields__
    json_prompt = []

    for name, field in fields.items():
        field_info = pydantic_model.__fields__[name]
        description = field_info.description or ""
        json_prompt.append(f'"{name}": ({field_info.annotation}) // {description},')

    json_prompt[-1] = json_prompt[-1][:-1]  # Remove the trailing comma
    json_prompt.append("\n}")
    return "\n".join(json_prompt)

if __name__ == "__main__":
    # Example usage with a simple Pydantic model
    class ExampleModel(BaseModel):
        name: str = Field(..., description="The name of the person.")
        age: Union[float, int] = Field(..., description="The age of the person")
        is_student: bool = Field(..., description="Whether the person is a student or not."  )
        hobbies: list[str] = Field(None, description="A list of the person's hobbies.")
        characteristics: dict[str, str] = Field(None, description="A dictionary of the person's characteristics. Keys are the characteristic names, values are the characteristic values.")


    # Construct the prompt
    prompt = construct_json_prompt(ExampleModel)
    print(prompt)
