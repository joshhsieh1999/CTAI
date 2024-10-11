"use client";

import { Image, Popover, PopoverContent, PopoverTrigger, Spinner } from "@nextui-org/react";
import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";

export default function AIChat({ userMessage }: { userMessage: string }) {
  const {
    messages,
    input,
    isLoading,
    handleSubmit,
    setInput,
    handleInputChange,
    reload,
    stop,
  } = useChat({
    api: `/api/chat`,
    headers: {
      "Content-Type": "application/json", // using JSON because of vercel/ai 2.2.26
    },
    onError: (error: unknown) => {
      if (!(error instanceof Error)) throw error;
      const message = JSON.parse(error.message);
      alert(message.detail);
    },
  });

  const formRef = useRef<HTMLFormElement>(null);
  const [submitTrigger, setSubmitTrigger] = useState(false);

  useEffect(() => {
    setInput(userMessage);
    // setSubmitTrigger(true);
  }, [userMessage]);

  useEffect(() => {
    if (submitTrigger && formRef.current) {
      formRef.current.requestSubmit();
      setSubmitTrigger(false); // Reset the trigger
    }
  }, [submitTrigger]);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'none' }}>
        <input type="text" value={input} onChange={handleInputChange} />
      </form>

      <Popover placement="bottom-start" isOpen={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <PopoverTrigger>
          <button
            onClick={() => setSubmitTrigger(true)}
          >
            <Image src="/static/images/AIIcon.png" alt="AI Chat" width={30} height={30} />
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <div>
            <div className="px-1 py-2">
              {isLoading && messages.length == 1
                ? <Spinner />
                : messages.length == 2 && messages[1].content && (messages[1].content.split('\n').map((line, idx) => (<div key={idx}><p className="text-lg min-h-5">{line}</p></div>)))}
              {/* {messages.map((message, index) => (
                // newline character is not rendered in the browser
                // so we have to use <br> tag to render it
                <p key={index}>{message.content.split('\n').map(line => (<p>{line}</p>))}</p>
                // <p key={index}>{message.content}</p>
              ))} */}
            </div>
                <div className="px-1 py-2 text-center">*AI Insight can make mistakes, content is for reference only.</div>
          </div>
        </PopoverContent>
      </Popover>
      {/* <p className="text-small text-default-400">Open: {isOpen ? "true" : "false"}</p> */}

    </div>
  );
}
