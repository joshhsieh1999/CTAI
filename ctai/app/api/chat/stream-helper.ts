import { StreamData } from "ai";
import { encodingForModel } from "js-tiktoken";
import {
  CallbackManager, ChatMessage, Metadata,
  NodeWithScore,
  ToolCall,
  ToolOutput, type LLMStartEvent
} from "llamaindex";
import { extractText } from "llamaindex/llm/utils";

export function appendImageData(data: StreamData, imageUrl?: string) {
  if (!imageUrl) return;
  data.appendMessageAnnotation({
    type: "image",
    data: {
      url: imageUrl,
    },
  });
}

export function appendSourceData(
  data: StreamData,
  sourceNodes?: NodeWithScore<Metadata>[],
) {
  if (!sourceNodes?.length) return;
  data.appendMessageAnnotation({
    type: "sources",
    data: {
      nodes: sourceNodes.map((node) => ({
        ...node.node.toMutableJSON(),
        id: node.node.id_,
        score: node.score ?? null,
      })),
    },
  });
}

export function appendEventData(data: StreamData, title?: string) {
  if (!title) return;
  data.appendMessageAnnotation({
    type: "events",
    data: {
      title,
    },
  });
}

export function appendToolData(
  data: StreamData,
  toolCall: ToolCall,
  toolOutput: ToolOutput,
) {
  data.appendMessageAnnotation({
    type: "tools",
    data: {
      toolCall: {
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input,
      },
      toolOutput: {
        output: toolOutput.output,
        isError: toolOutput.isError,
      },
    },
  });
}

const encoding = encodingForModel("gpt-4o");
let queryTokenCount = 0, responseTokenCount = 0;

export function createCallbackManager(stream: StreamData) {
  const callbackManager = new CallbackManager();

  callbackManager.on("retrieve", (data) => {
    const { nodes, query } = data.detail;
    appendEventData(stream, `Retrieving context for query: '${query}'`);
    appendEventData(
      stream,
      `Retrieved ${nodes.length} sources to use as context for the query`,
    );
  });

  callbackManager.on("llm-tool-call", (event) => {
    const { name, input } = event.detail.payload.toolCall;
    const inputString = Object.entries(input)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    appendEventData(
      stream,
      `Using tool: '${name}' with inputs: '${inputString}'`,
    );
  });

  callbackManager.on("llm-tool-result", (event) => {
    const { toolCall, toolResult } = event.detail.payload;
    appendToolData(stream, toolCall, toolResult);
  });

  // Listen for the token count

  callbackManager.on("llm-start", (event: LLMStartEvent) => {
    const { messages } = event.detail.payload;
    // https://openai.com/pricing
    // $10.00 / 1M tokens
    const queryCost = messages.reduce((count: number, message: ChatMessage) => {
      return count + encoding.encode(extractText(message.content)).length;
    }, 0);
    console.log("Current Query tokens:", queryCost);
    console.log("Current Query prices: $", (queryCost / 1_000_000) * 5);
    queryTokenCount += queryCost;
    console.log("Query Total Tokens:", queryTokenCount);
    console.log("Query Total Price: $", (queryTokenCount / 1_000_000) * 5);
  });

  callbackManager.on("llm-end", (event) => {
    const { response } = event.detail.payload;
    const responseCost = encoding.encode(extractText(response.message.content)).length;
    // https://openai.com/pricing
    // $15.00 / 1M tokens
    console.log("Current Response tokens:", responseCost);
    console.log("Current Response prices: $", (responseCost / 1_000_000) * 15);
    responseTokenCount += responseCost;
    console.log("Response Total Tokens:", responseTokenCount);
    console.log("Response Total Price: $", (responseTokenCount / 1_000_000) * 15);
    console.log("Total Price: $", (queryTokenCount / 1_000_000) * 5 + (responseTokenCount / 1_000_000) * 15);
  });

  return callbackManager;
}
