"""Small, versioned rich-text document. Unknown tags/attributes are rejected."""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Span(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(max_length=50000)
    marks: list[Literal["bold", "italic", "underline"]] = Field(
        default_factory=list, max_length=3
    )


class Block(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Each list block is one list item; consecutive items form a list.
    type: Literal["paragraph", "bulleted_list", "numbered_list"] = "paragraph"
    children: list[Span] = Field(min_length=1, max_length=1000)


class PostBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal[1] = 1
    blocks: list[Block] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def bounded(self):
        if len(self.plain_text()) > 50000:
            raise ValueError("Post body exceeds 50,000 characters")
        if sum(len(block.children) for block in self.blocks) > 2000:
            raise ValueError("Too many text spans")
        if not self.plain_text().strip():
            raise ValueError("Post text is required")
        return self

    def plain_text(self):
        return "\n".join(
            "".join(span.text for span in block.children) for block in self.blocks
        )


def text_body(text):
    return {
        "version": 1,
        "blocks": [
            {"type": "paragraph", "children": [{"text": line, "marks": []}]}
            for line in text.split("\n")
        ],
    }


class StoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="Post", min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=50000)
    body: PostBody | None = None
    post_type: Literal["post", "story", "kudos", "milestone"] = "story"
    is_anonymous: bool = False
    recipient_label: str | None = Field(default=None, max_length=255)
    attachment_ids: list[int] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def valid(self):
        if self.body is None:
            self.body = PostBody.model_validate(text_body(self.content or ""))
        self.content = self.body.plain_text()
        if not self.title.strip():
            raise ValueError("Title is required")
        if self.post_type == "kudos" and not (self.recipient_label or "").strip():
            raise ValueError("Kudos recipient is required")
        return self


class QuoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quote: str | None = Field(default=None, max_length=10000)
    body: PostBody | None = None
    author: str | None = Field(default=None, max_length=255)
    attachment_ids: list[int] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def valid(self):
        if self.body is None:
            self.body = PostBody.model_validate(text_body(self.quote or ""))
        self.quote = self.body.plain_text()
        if len(self.quote) > 10000:
            raise ValueError("Quotes must be at most 10,000 characters")
        return self
