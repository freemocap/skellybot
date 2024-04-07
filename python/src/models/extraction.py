from pydantic import BaseModel, Field


class ExtractedTextData(BaseModel):
    detailed_summary: str = Field("",
                                  description="An exhaustively thorough and detailed summary of the major points of this text in a bulleted outline format")
    highlights: str = Field("",
                            description="A list of the most important points of the text, formatted as a bulleted list")
    short_summary: str = Field("", description="A short (2-3 sentence) summary of the text")
    very_short_summary: str = Field("", description="A very short one sentence summary of the text")
    extremely_short_summary: str = Field("", description="An extremely short 6-10 word summary of the text")
    tags: str = Field("",
                      description="A list of tags that describe the content of the text, formatted as comma separated #lower-kabob-case")

    def __str__(self):
        tags = "\n".join(self.tags.split(","))
        return f"""
# {self.extremely_short_summary}\
## Very Short Summary\n
{self.very_short_summary}\n\n
## Short Summary\n
{self.short_summary}\n\n
## Detailed Summary\n
{self.detailed_summary}\n\n
## Tags\n
{tags}\n\n
        """
