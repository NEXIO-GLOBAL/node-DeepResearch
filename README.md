```bash
export GOOGLE_API_KEY=...  # ask han
export JINA_API_KEY=jina_...  # get from jina.ai
npm install
# example: no tool calling 
npm run dev "1+1="
npm run dev "what is the capital of France?"

# example: simple
npm run dev "what is the latest news from Jina AI?"

# example: wrong answer
npm run dev "what is the twitter account of jina ai's founder"

# example: open question, long chain of thoughts
npm run dev "who will be president of US in 2028?"
npm run dev "what should be jina ai strategy for 2025?"
```

```mermaid
flowchart TD
    subgraph Inputs[System Inputs]
        OrigQuestion[Original Question]
        TokenBudget[Token Budget]
    end

    subgraph States[Global States]
        direction TB
        GapQueue[Question Queue]
        ContextStore[Action History]
        BadStore[Failed Attempts]
        QuestionStore[Question History]
        KeywordStore[Keyword History]
        KnowledgeStore[Knowledge Base]
        URLStore[URL Map]
    end

    subgraph Outputs[System Outputs]
        FinalAnswer[Answer]
    end

    TokenBudget -->|check| End[System End]
    
    OrigQuestion -->|initialize| GapQueue
    GapQueue -->|pop| NextQ[Question]
    NextQ -->|generate| AIResponse[Response]
    AIResponse -->|analyze| ActionType{Action Type}
    
    ActionType -->|is search| SearchOp[Search Results]
    SearchOp -->|store| ContextStore
    SearchOp -->|add| KeywordStore
    SearchOp -->|update| URLStore
    SearchOp -->|continue| TokenBudget
    
    ActionType -->|is visit| URLData[URL Content]
    URLData -->|store| ContextStore
    URLStore -->|provide| URLData
    URLData -->|continue| TokenBudget
    
    ActionType -->|is reflect| NewQuestions[Questions]
    NewQuestions -->|check against| QuestionStore
    NewQuestions -->|filter| UniqueQuestions[Unique Questions]
    UniqueQuestions -->|push to| GapQueue
    UniqueQuestions -->|add to| QuestionStore
    UniqueQuestions -->|continue| TokenBudget
    
    ActionType -->|is answer| AnswerCheck{Original Question}
    AnswerCheck -->|compare with| OrigQuestion
    AnswerCheck -->|is not| ContextStore
    AnswerCheck -->|store valid| KnowledgeStore
    ContextStore -->|continue| TokenBudget
    
    AnswerCheck -->|is| Evaluation[Answer Quality]
    Evaluation -->|check| ValidCheck{Quality}
    ValidCheck -->|passes| FinalAnswer
    FinalAnswer -->|return| End
    
    ValidCheck -->|fails| BadStore
    ValidCheck -->|fails and clear| ContextStore

    classDef state fill:#e1f5fe,stroke:#01579b
    classDef input fill:#e8f5e9,stroke:#2e7d32
    classDef output fill:#fce4ec,stroke:#c2185b
    class GapQueue,ContextStore,BadStore,QuestionStore,KeywordStore,KnowledgeStore,URLStore state
    class OrigQuestion,TokenBudget input
    class FinalAnswer output
```