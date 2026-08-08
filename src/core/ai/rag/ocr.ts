import { getOpenAiClient } from "@/core/ai/client";

const OCR_MODEL =
  process.env.OPENAI_OCR_MODEL ??
  process.env.OPENAI_MODEL ??
  "gpt-5";

function dataUrl(
  contentType: string,
  buffer: Buffer,
) {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function extractTextWithGovernedOcr(input: {
  filename: string;
  contentType: string;
  buffer: Buffer;
}) {
  const client = getOpenAiClient();

  const commonInstruction = [
    "Extract the complete readable text from this procurement document.",
    "Preserve headings, table labels, identifiers, dates, monetary values, addresses, clause numbering and form fields.",
    "Do not summarize, interpret, translate, correct, or invent missing text.",
    "If a region is unreadable, write [UNREADABLE].",
    "Return only the extracted document text.",
  ].join(" ");

  const normalizedType = input.contentType.toLowerCase();
  const lowerName = input.filename.toLowerCase();

  let content: unknown[];

  if (
    normalizedType === "image/png" ||
    normalizedType === "image/jpeg" ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg")
  ) {
    const imageType =
      normalizedType === "image/png"
        ? "image/png"
        : "image/jpeg";

    content = [
      {
        type: "input_text",
        text: commonInstruction,
      },
      {
        type: "input_image",
        image_url: dataUrl(imageType, input.buffer),
        detail: "high",
      },
    ];
  } else if (
    normalizedType === "application/pdf" ||
    lowerName.endsWith(".pdf")
  ) {
    content = [
      {
        type: "input_text",
        text: commonInstruction,
      },
      {
        type: "input_file",
        filename: input.filename,
        file_data: dataUrl("application/pdf", input.buffer),
      },
    ];
  } else {
    throw new Error(
      "Governed OCR supports scanned PDF, PNG and JPEG documents.",
    );
  }

  const response = await client.responses.create({
    model: OCR_MODEL,
    input: [
      {
        role: "user",
        content: content as never,
      },
    ],
  });

  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("OCR did not return extractable document text.");
  }

  return {
    text,
    model: OCR_MODEL,
    method: "openai-vision-ocr",
  };
}
