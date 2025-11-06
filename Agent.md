# Agent Architecture: The Nexus

This document outlines the architectural vision for the AI Architect application, moving towards a modular, multi-agent system.

## Core Philosophy

The application is built around a central "Nexus" where a primary user-facing agent can leverage a suite of specialized, independent agents to perform complex tasks. This modular approach allows for greater scalability, maintainability, and the ability to easily add new capabilities.

### 1. Primary Agents

Primary agents are the main interface for the user. In the current implementation, this is the **Voice Assistant**.

-   **Role:** Manages the main conversational flow, maintains persona, and interacts directly with the user in real-time.
-   **Model:** Typically a powerful, low-latency model optimized for conversation (e.g., `gemini-2.5-flash-native-audio-preview-09-2025`).
-   **Key Feature:** Orchestrates tasks by delegating to specialized agents via function calling.

### 2. Specialized Agents (Tools)

Specialized agents are designed to perform one task exceptionally well. They are not directly exposed to the user but are invoked as "tools" by a primary agent.

-   **Role:** Handle specific, well-defined tasks like data retrieval, analysis, or content generation.
-   **Model:** Can use different models best suited for the task (e.g., a fast model for summarization, a powerful model for complex reasoning).
-   **Key Feature:** Encapsulate complex logic, making the primary agent's job simpler. They receive a query and return a structured result.

## Current Implementation

The system is being refactored to align with this vision.

-   **Primary Agent:** The `AssistantLayout` and `GeminiLiveContext` together form the primary **Voice Assistant**. It handles real-time audio streaming, transcription, and persona management.
-   **Specialized Agent Example: Web Search Agent**
    -   **File:** `src/agents/webSearchAgent.ts`
    -   **Purpose:** To provide up-to-date information from the web.
    -   **Model:** `gemini-2.5-flash`
    -   **Functionality:**
        1.  Receives a query from the primary Voice Assistant.
        2.  Uses the Gemini API with the `googleSearch` tool to find relevant web pages.
        3.  Summarizes the findings into a concise answer.
        4.  Returns the summary and the source URLs to the primary agent.
    -   **Integration:** The Voice Assistant invokes this agent via a `webSearch` function call when it determines a user's query requires current information.

## Future Vision

This architecture allows for the addition of many more specialized agents, such as:

-   **Memory Agent:** An agent dedicated to sophisticated semantic search across the user's memory bank.
-   **Image Generation Agent:** An agent that takes a text prompt and returns a generated image.
-   **Code Agent:** A specialized agent for writing, debugging, and explaining code snippets.

By building out these independent, tool-like agents, the primary assistant becomes increasingly capable without complicating its core conversational logic.
