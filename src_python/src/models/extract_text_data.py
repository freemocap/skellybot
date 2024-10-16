from pydantic import BaseModel, Field

from src.utilities.sanitize_filename import sanitize_name


class ExtractedTextData(BaseModel):
    title_slug: str = Field("",
                            description="The a descriptive title of the text, will be used as the H1 header, the filename slug, and the URL slug. It should be short (only a few words) and provide a terse preview of the basic content of the full text, it should include NO colons")
    tags: str = Field("",
                      description="A list of tags that describe the content of the text, formatted as comma separated #lower-kabob-case. These should be like topic tags that can be used to categorize the text within a larger collection of texts. Ignore conversational aspects (such as 'greetings', 'farewells', 'thanks', etc.)")
    extremely_short_summary: str = Field("", description="An extremely short 6-10 word summary of the text")
    very_short_summary: str = Field("", description="A very short one sentence summary of the text")
    short_summary: str = Field("", description="A short (2-3 sentence) summary of the text")
    highlights: str = Field("",
                            description="A list of the most important points of the text, formatted as a bulleted list")
    detailed_summary: str = Field("",
                                  description="An exhaustively thorough and detailed summary of the major points of this text in markdown bulleted outline format, like `* point 1\n* point 2\n* point 3` etc")
    backlinks: str = Field("",
                           description="A list of key words and phrases in the text which will highlighted as [[backlinks]] within the text, These should be the kinds of things you would expect to find a Wikipedia article about. Format this section as comma separated wiki style links like `[[backlink 1]], [[backlink 2]], [[backlink 3]]` etc. ")
    pull_quotes: str = Field("",description="A list of the most important quotes from the text which the key points of the contentful aspects of the text, formatted as a bulleted list")
    @property
    def title(self):
        return self.title_slug.replace("-", " ").title()

    @property
    def filename(self, extension="md"):
        if not extension.startswith("."):
            extension = "." + extension
        return sanitize_name(self.title_slug.lower()) + f"{extension}"

    def __str__(self):
        tags = "\n".join(self.tags.split(","))
        return f"""
# {self.title}\n\n
## Extremely Short Summary\n\n
{self.extremely_short_summary}\n\n
## Highlights\n
{self.highlights}\n\n
## Pull Quotes\n
{self.pull_quotes}\n\n
## Very Short Summary\n
{self.very_short_summary}\n\n
## Short Summary\n
{self.short_summary}\n\n
## Detailed Summary\n
{self.detailed_summary}\n\n
## Tags\n
{tags}\n\n
## Backlinks\n
{self.backlinks}\n\n
        """


if __name__ == "__main__":
    from src.ai.construct_prompt import construct_analyzer_prompt

    data = ExtractedTextData(
        detailed_summary="This is a detailed summary of the text",
        highlights="These are the highlights of the text",
        short_summary="This is a short summary of the text",
        very_short_summary="This is a very short summary of the text",
        extremely_short_summary="This is an extremely short summary of the text",
        tags="tag1,tag2,tag3"
    )
    print(data)

    dummy_analyzer_prompt = construct_analyzer_prompt(ExtractedTextData, "This is a test input text")

    print(f"\n\n\n ===================== \n\n\n Dummy Analyzer Prompt: \n\n\n {dummy_analyzer_prompt}")
