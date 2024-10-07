from src.models.extract_text_data import ExtractedTextData

TEST_STRING="""
 The Free Motion Capture Project (FreeMoCap) aims to provide research-grade markerless motion capture software to everyone for free.

We're building a user-friendly framework that connects an array of `bleeding edge` open-source tools from the computer vision and machine learning communities to accurately record full-body 3D movement of humans, animals, robots, and other objects.

We want to make the newly emerging mind-boggling, future-shaping technologies that drive FreeMoCap's core functionality accessible to communities of people who stand to benefit from them.

We follow a “Universal Design” development philosophy, with the goal of creating a system that serves the needs of a professional research scientist while remaining intuitive to a 13-year-old with no technical training and no outside assistance.

A high-quality, minimal-cost motion capture system would be a transformative tool for a wide range of communities - including 3d animators, game designers, athletes, coaches, performers, scientists, engineers, clinicians, and doctors.

We hope to create a system that brings new technological capacity to these groups while also building bridges between them.

Everyone has a reason to record human movement
We want to help them do it
"""
if __name__ == "__main__":
  from src.ai.construct_prompt import construct_analyzer_prompt
  from openai import OpenAI
  from dotenv import load_dotenv
  import os
  load_dotenv("../../env.analysis")

  OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
  if not OPENAI_API_KEY:
      raise ValueError("Please set OPENAI_API_KEY in your .env file")

  test_analyzer_prompt = construct_analyzer_prompt(ExtractedTextData, TEST_STRING)

  print(f"\n\n\n ===================== \n\n\n Dummy Analyzer Prompt: \n\n\n {test_analyzer_prompt}")

  openai_client = OpenAI(api_key=OPENAI_API_KEY)

  from openai import OpenAI
  client = OpenAI()
  print("Sending chat completion request...")
  response = client.chat.completions.create(
    model="gpt-3.5-turbo-0125",
    response_format={ "type": "json_object" },
    messages=[
      {"role": "system", "content": test_analyzer_prompt},
    ]
  )
  print("Chat completion response:")
  print(response.choices[0].message.content)

  ai_response = response.choices[0].message.content

  from src.models.extract_text_data import ExtractedTextData
  import json
  constructed_pydantic_model = ExtractedTextData(**json.loads(ai_response))
  print(constructed_pydantic_model)
