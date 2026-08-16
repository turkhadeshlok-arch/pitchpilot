/*
 * Gemini provider boundary.
 *
 * Secure production setup should inject this at runtime before ai.js loads:
 * window.PITCHPILOT_CONFIG = {
 *   mode: 'live',
 *   transport: 'proxy',
 *   endpoint: 'YOUR_SECURE_SERVER_ENDPOINT',
 *   publicToken: 'OPTIONAL_BROWSER_SAFE_TOKEN'
 * };
 *
 * Direct mode is available for local experiments only. A Gemini API key is
 * visible to anyone using a browser app, so never commit one to this repo.
 * Without configuration, the app remains explicitly labeled DEVELOPMENT MOCK.
 */
(() => {
  const MODEL = "gemini-3.6-flash";
  const GEMINI_INTERACTIONS_ENDPOINT =
    "https://generativelanguage.googleapis.com/v1beta/interactions";
  const REQUEST_TIMEOUT_MS = 30000;
  const config = window.PITCHPILOT_CONFIG || {
    mode: "mock",
    transport: "proxy",
  };
  const hasApiKey =
    typeof config.apiKey === "string" &&
    config.apiKey.trim().length > 0 &&
    config.apiKey !== "YOUR_GEMINI_API_KEY";
  const liveConfigured =
    config.mode === "live" &&
    (config.transport === "direct" ? hasApiKey : Boolean(config.endpoint));

  const analysisSchema = {
    type: "object",
    properties: {
      overall: {
        type: "integer",
        description: "Overall conviction score from 1 to 100.",
      },
      problem: {
        type: "integer",
        description: "Problem strength score from 1 to 100.",
      },
      market: {
        type: "integer",
        description: "Market potential score from 1 to 100.",
      },
      differentiation: {
        type: "integer",
        description: "Differentiation score from 1 to 100.",
      },
      feasibility: {
        type: "integer",
        description: "Feasibility score from 1 to 100.",
      },
      summary: { type: "string" },
      risks: { type: "array", items: { type: "string" } },
      assumptions: { type: "array", items: { type: "string" } },
      opportunities: { type: "array", items: { type: "string" } },
      brutal: { type: "string" },
      nextSteps: { type: "array", items: { type: "string" } },
    },
    required: [
      "overall",
      "problem",
      "market",
      "differentiation",
      "feasibility",
      "summary",
      "risks",
      "assumptions",
      "opportunities",
      "brutal",
      "nextSteps",
    ],
    additionalProperties: false,
  };

  const pitchSchema = {
    type: "object",
    properties: {
      elevator: { type: "string" },
      value: { type: "string" },
      businessModel: { type: "string" },
      differentiator: { type: "string" },
      structure: {
        type: "array",
        items: { type: "array", items: { type: "string" } },
      },
      demo: { type: "string" },
    },
    required: [
      "elevator",
      "value",
      "businessModel",
      "differentiator",
      "structure",
      "demo",
    ],
    additionalProperties: false,
  };

  const salesCoachSchema = {
    type: "object",
    properties: {
      opening: { type: "string" },
      explanation: { type: "string" },
      customerPitches: { type: "array", items: { type: "array", items: { type: "string" } } },
      discoveryQuestions: { type: "array", items: { type: "string" } },
      objectionResponses: { type: "array", items: { type: "array", items: { type: "string" } } },
      closingLines: { type: "array", items: { type: "string" } },
      doorToDoor: { type: "string" },
      phone: { type: "string" },
      whatsapp: { type: "string" },
    },
    required: ["opening", "explanation", "customerPitches", "discoveryQuestions", "objectionResponses", "closingLines", "doorToDoor", "phone", "whatsapp"],
    additionalProperties: false,
  };

  const roleplaySchema = {
    type: "object",
    properties: { customerReply: { type: "string" }, mood: { type: "string" }, coachingHint: { type: "string" }, shouldContinue: { type: "boolean" } },
    required: ["customerReply", "mood", "coachingHint", "shouldContinue"],
    additionalProperties: false,
  };

  const salesScoreSchema = {
    type: "object",
      properties: { clarity: { type: "integer" }, confidence: { type: "integer" }, relevance: { type: "integer" }, listening: { type: "integer" }, objectionHandling: { type: "integer" }, closingStrength: { type: "integer" }, feedback: { type: "string" }, nextMove: { type: "string" }, suggestedReplies: { type: "array", items: { type: "string" } } },
    required: ["clarity", "confidence", "relevance", "listening", "objectionHandling", "closingStrength", "feedback", "nextMove", "suggestedReplies"],
    additionalProperties: false,
  };

  const salesTask = task => ["sales-coach", "roleplay", "sales-score"].includes(task);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const score = (value) =>
    Math.max(1, Math.min(100, Math.round(Number(value) || 1)));
  const textList = (value) =>
    Array.isArray(value)
      ? value.filter((item) => typeof item === "string" && item.trim())
      : [];

  function buildSystemPrompt(task) {
    const role =
      "You are PitchPilot, a skeptical but constructive startup advisor. Challenge assumptions, distinguish evidence from guesses, identify realistic risks, find concrete differentiation, and recommend validation steps. Do not blindly praise the idea or use generic motivational language. Do not invent traction, customers, revenue, or market evidence.";
    if (task === "sales-coach") return `${role} You are also an expert sales conversation coach. Create practical language a real salesperson can say aloud. Keep it specific to the product, customer, channel, location, and goal. Do not invent proof, discounts, customers, or results. Return only JSON matching the supplied schema.`;
    if (task === "roleplay") return `${role} Act as a realistic customer in a sales roleplay. Respond with believable resistance, not a helpful assistant answer. Stay in character as the selected customer persona, remember the prior exchange, and do not repeat the same objection mechanically. Keep the customer reply short and grounded in the supplied customer type, objection, channel, and context. Return only JSON matching the supplied schema.`;
    if (task === "sales-score") return `${role} Evaluate a salesperson's latest reply in context. Score it against the salesperson's stated conversation goal and the selected difficulty. Be direct and useful. Give one specific coaching point, the best next move, and three natural replies the salesperson could say next. Return only JSON matching the supplied schema.`;
    if (task === "analyze")
      return `${role} Analyze the startup idea and return only JSON matching the supplied schema. Scores must be integers from 1 to 100. Make every risk and next step specific enough to act on.`;
    return `${role} You are now an expert startup pitch writer. Rewrite the founder's idea and the advisor's analysis into polished pitch language from scratch. Never mechanically concatenate fields or copy full sentences from the idea, risks, assumptions, opportunities, or other analysis text. Do not mention analysis, signal reports, opportunity signals, brutal feedback, or internal reasoning in the pitch. Improve the positioning when the analysis reveals a sharper angle, but stay faithful to the actual product and customer. Every sentence must be grammatically complete, natural when spoken aloud, confident but honest, and free of unsupported metrics or claims. The differentiator must be one concise product advantage, not a recommendation or pivot phrase. Return only JSON matching the supplied schema.`;
  }

  function buildPrompt(task, data, analysis) {
    if (task === "sales-coach") return `Build a complete sales conversation coaching kit. Rewrite the source details into natural language; do not mechanically repeat them. Include a natural opening, a 30-second explanation, a useful pitch for each customer type, discovery questions, objection responses, closing lines, and channel-specific scripts for door-to-door, phone, and WhatsApp.\n\nProduct: ${data.product}\nPrice: ${data.price || "Not provided"}\nCustomer types: ${data.customers}\nChannel: ${data.channel}\nCommon objections: ${data.objections || "Not provided"}\nSales goal: ${data.goal}\nLocation/context: ${data.location || "Not provided"}\nHousehold or business type: ${data.accountType || "Not provided"}`;
    if (task === "roleplay") return `Continue a realistic sales roleplay. The salesperson is selling the product below. Respond as the selected persona at the selected difficulty. React specifically to the salesperson's latest reply and advance the conversation instead of repeating the opening objection. Do not resolve the objection for them. Include a short coaching hint for what a strong salesperson should notice, without writing the salesperson's reply.\n\nProduct: ${data.product}\nCustomer type: ${data.customerType}\nPersona: ${data.persona || "A realistic but guarded customer"}\nDifficulty: ${data.difficulty || "realistic"}\nChannel: ${data.channel}\nLocation/context: ${data.location || "Not provided"}\nCustomer situation: ${data.situation}\nConversation so far: ${data.history || "No previous turns."}\nSalesperson's latest reply: ${data.reply || "The conversation is just starting."}`;
    if (task === "sales-score") return `Score the salesperson's latest reply against this goal: ${data.goal || "move the conversation to an appropriate next step"}. Consider whether they listened to the customer's exact concern before pitching, used clear language, stayed relevant, sounded confident without pressure, handled the objection, and moved toward that goal. Difficulty: ${data.difficulty || "realistic"}. Return three distinct, natural suggested replies, not explanations.\n\nCustomer said: ${data.customerSaid}\nSalesperson replied: ${data.reply}\nProduct: ${data.product}\nConversation channel: ${data.channel}`;
    if (task === "analyze")
      return `Stress-test this startup idea. Assess the problem, market, differentiation, and feasibility. Identify the weak assumptions the founder must validate, the biggest realistic risks, the best opportunities, the brutal truth, and the three highest-leverage next steps.\n\nIdea: ${data.idea}\nTarget customer: ${data.customer}\nProblem: ${data.problem}\nBusiness model: ${data.businessModel || "Not defined"}\nAdditional context: ${data.context || "None"}`;
    return `Write a coherent startup pitch from the source material below. Treat the analysis as strategic input, not copy. Rephrase every section into natural, concise professional language and do not repeat the full product description unnecessarily.\n\nRequired output behavior:\n- elevator: one or two sentences maximum; make the customer, problem, and product outcome immediately clear.\n- value: clearly express target user → problem → outcome.\n- businessModel: explain how the business makes money naturally in one or two sentences; if no model was provided, describe a testable starting approach without presenting it as proven.\n- differentiator: exactly one clear sentence describing a concrete product advantage.\n- structure: exactly five concise presentation sections in this order: Tension, Insight, Product, Proof, Ask. Each description should be one or two sentences of practical guidance for a real presentation. Do not invent proof; if evidence is missing, frame the Proof section as what must be demonstrated or validated.\n- demo: write a short script a founder could literally say while demonstrating the product. Show the key user action and outcome without repeating the entire idea or making unsupported claims.\n\nSource material:\nIdea: ${data.idea}\nTarget customer: ${data.customer}\nProblem: ${data.problem}\nBusiness model: ${data.businessModel || "Not defined"}\nAdditional context: ${data.context || "None"}\nAdvisor analysis: ${JSON.stringify(analysis || {})}\n\nBefore returning JSON, silently check that the pitch is grammatical, sounds natural aloud, does not copy raw analysis language, contains no buzzword-heavy filler, and invents no traction, revenue, customers, partnerships, or market data.`;
  }

  function responseFormat(schema) {
    return { type: "text", mime_type: "application/json", schema };
  }

  function requestConfig(task, data, analysis) {
    const body = {
      model: MODEL,
      input: buildPrompt(task, data, analysis),
      system_instruction: buildSystemPrompt(task),
      response_format: responseFormat(
        task === "analyze" ? analysisSchema : task === "pitch" ? pitchSchema : task === "sales-coach" ? salesCoachSchema : task === "roleplay" ? roleplaySchema : salesScoreSchema,
      ),
      store: false,
    };
    const headers = { "Content-Type": "application/json" };
    if (config.transport === "direct") {
      headers["x-goog-api-key"] = config.apiKey;
      return { endpoint: GEMINI_INTERACTIONS_ENDPOINT, headers, body };
    }
    if (config.publicToken)
      headers.Authorization = `Bearer ${config.publicToken}`;
    return { endpoint: config.endpoint, headers, body };
  }

  function parseJson(value) {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(
        "Gemini returned malformed JSON instead of the requested structured response.",
      );
    }
  }

  function extractOutput(payload) {
    if (payload?.output_text) return parseJson(payload.output_text);
    if (typeof payload?.output === "string") return parseJson(payload.output);
    const textPart = payload?.output?.find?.(
      (part) => part.type === "text",
    )?.text;
    if (textPart) return parseJson(textPart);
    const modelOutput = payload?.steps
      ?.filter?.((step) => step.type === "model_output")
      .pop();
    const stepText = modelOutput?.content?.find?.(
      (part) => part.type === "text",
    )?.text;
    if (stepText) return parseJson(stepText);
    return parseJson(payload?.data || payload?.result || payload);
  }

  function normalizeAnalysis(value) {
    if (!value || typeof value !== "object")
      throw new Error("Gemini returned an invalid analysis object.");
    const result = {
      overall: score(value.overall),
      problem: score(value.problem),
      market: score(value.market),
      differentiation: score(value.differentiation),
      feasibility: score(value.feasibility),
      summary: String(value.summary || ""),
      risks: textList(value.risks),
      assumptions: textList(value.assumptions),
      opportunities: textList(value.opportunities),
      brutal: String(value.brutal || ""),
      nextSteps: textList(value.nextSteps),
    };
    if (
      !result.summary ||
      !result.brutal ||
      !result.risks.length ||
      !result.nextSteps.length
    )
      throw new Error("Gemini returned an incomplete analysis.");
    return result;
  }

  function normalizePitch(value) {
    if (!value || typeof value !== "object")
      throw new Error("Gemini returned an invalid pitch object.");
    const structure = Array.isArray(value.structure)
      ? value.structure
          .filter((item) => Array.isArray(item) && item.length >= 2)
          .map((item) => [String(item[0]), String(item[1])])
      : [];
    const result = {
      elevator: String(value.elevator || ""),
      value: String(value.value || ""),
      businessModel: String(value.businessModel || ""),
      differentiator: String(value.differentiator || ""),
      structure,
      demo: String(value.demo || ""),
    };
    if (
      !result.elevator ||
      !result.value ||
      !result.businessModel ||
      !result.differentiator ||
      !result.structure.length ||
      !result.demo
    )
      throw new Error("Gemini returned an incomplete pitch.");
    return result;
  }

  function normalizeSalesCoach(value) {
    if (!value || typeof value !== "object") throw new Error("Gemini returned an invalid sales coaching kit.");
    const pairs = list => Array.isArray(list) ? list.filter(item => Array.isArray(item) && item.length >= 2).map(item => [String(item[0]), String(item[1])]) : [];
    const result = { opening: String(value.opening || ""), explanation: String(value.explanation || ""), customerPitches: pairs(value.customerPitches), discoveryQuestions: textList(value.discoveryQuestions), objectionResponses: pairs(value.objectionResponses), closingLines: textList(value.closingLines), doorToDoor: String(value.doorToDoor || ""), phone: String(value.phone || ""), whatsapp: String(value.whatsapp || "") };
    if (!result.opening || !result.explanation || !result.customerPitches.length || !result.discoveryQuestions.length || !result.objectionResponses.length || !result.closingLines.length) throw new Error("Gemini returned an incomplete sales coaching kit.");
    return result;
  }

  function normalizeRoleplay(value) {
    if (!value || typeof value !== "object" || !value.customerReply) throw new Error("Gemini returned an invalid roleplay response.");
    return { customerReply: String(value.customerReply), mood: String(value.mood || "guarded"), coachingHint: String(value.coachingHint || "Listen for the concern before answering."), shouldContinue: value.shouldContinue !== false };
  }

  function normalizeSalesScore(value) {
    if (!value || typeof value !== "object") throw new Error("Gemini returned an invalid sales score.");
    return { clarity: score(value.clarity), confidence: score(value.confidence), relevance: score(value.relevance), listening: score(value.listening), objectionHandling: score(value.objectionHandling), closingStrength: score(value.closingStrength), feedback: String(value.feedback || ""), nextMove: String(value.nextMove || ""), suggestedReplies: textList(value.suggestedReplies).slice(0, 3) };
  }

  function mockAnalysis(data) {
    const base = score(
      53 +
        (data.idea.length + data.problem.length + data.customer.length) / 15 +
        (data.businessModel ? 7 : 0) +
        (data.context ? 5 : 0),
    );
    return normalizeAnalysis({
      overall: base,
      problem: base + 8,
      market: base - 3,
      differentiation: base - 6,
      feasibility: base - 2,
      summary:
        base > 72
          ? "Promising, with sharp edges. The core signal is real, but the story needs a tighter wedge."
          : "Interesting raw material. The opportunity is here, but a few assumptions need evidence.",
      risks: [
        "Your first customer acquisition path is still a hypothesis — name the first 20 people, not just the segment.",
        data.businessModel
          ? `The ${data.businessModel.toLowerCase()} model needs a willingness-to-pay test before it becomes a forecast.`
          : "The business model is still an open loop. A clear exchange of value will make the opportunity more believable.",
        "There may be adjacent solutions already earning trust. Your wedge needs to be narrower and more specific.",
      ],
      assumptions: [
        "Customers will change their current behavior for this solution.",
        "The stated problem is painful enough to earn budget or attention.",
        "Your first distribution channel can reach the buyer efficiently.",
      ],
      opportunities: [
        `Own the workflow layer around ${data.problem.toLowerCase().replace(/[.]$/, "")}.`,
        "Turn the first customer cohort into a measurable proof point.",
        "Make your differentiation a product behavior, not only a brand promise.",
      ],
      brutal: `Right now, this is a good direction — not yet a must-have. Your next breakthrough is proving that ${data.customer.toLowerCase()} will choose this over doing nothing.`,
      nextSteps: [
        "Interview five target customers and collect their current workaround.",
        "Prototype the smallest repeatable outcome, then measure time-to-value.",
        "Ask for a paid pilot before polishing the full product.",
      ],
    });
  }

  function mockPitch(data, analysis) {
    const differentiator =
      analysis?.opportunities?.[0] || "a focused workflow advantage";
    return normalizePitch({
      elevator: `${data.idea} — a focused way for ${data.customer.toLowerCase()} to solve ${data.problem.toLowerCase()}. Unlike generic alternatives, it starts with ${differentiator.toLowerCase()}.`,
      value: `We help ${data.customer.toLowerCase()} move from ${data.problem.toLowerCase()} to a measurable result, without adding another complicated tool.`,
      businessModel:
        data.businessModel ||
        "Start with a paid pilot, then introduce a recurring plan around the workflow that proves valuable.",
      differentiator,
      structure: [
        ["The tension", "Show the cost of the current problem."],
        ["The insight", "Explain why the old category misses the moment."],
        ["The product", "Demo the smallest magical outcome."],
        ["The proof", "Share the signal you have — or the test you will run."],
        ["The ask", "Make the next step specific and easy."],
      ],
      demo: `Open with the customer’s current workaround. Show the exact moment ${data.idea.toLowerCase()} removes friction. Close by returning to the measurable outcome.`,
    });
  }

  function mockSalesCoach(data) {
    const product = data.product || "this product";
    const customer = data.customers || "the customer";
    return normalizeSalesCoach({ opening: `Hi — I’m speaking with ${customer} because ${product.toLowerCase()} may help with a problem you already deal with. Can I ask how you handle it today?`, explanation: `${product} is designed to make the next step simpler for ${customer.toLowerCase()}, so you can spend less time dealing with the problem and more time on the outcome you want.`, customerPitches: [[customer, `For ${customer.toLowerCase()}, lead with the specific problem, then connect ${product.toLowerCase()} to a practical next step.`]], discoveryQuestions: ["How are you handling this today?", "What is the hardest part of that process?", "What would make a change worth considering?"], objectionResponses: [["It’s too expensive.", "That makes sense. Compared with what you use today, which part feels hardest to justify?"], ["I’m not interested.", "Understood. Is that because the problem is not urgent, or because you already have another way to handle it?"]], closingLines: ["Would it be useful to look at the simplest next step together?", "Should we schedule a short follow-up after you have had time to think about it?"], doorToDoor: `Hi, I’m in the area helping ${customer.toLowerCase()} with this problem. Could I ask one quick question about how you handle it today?`, phone: `Hi, this is a quick call about ${product.toLowerCase()}. I’m calling to understand how you currently handle the problem — is now a bad time?`, whatsapp: `Hi — I thought this might be relevant to ${customer.toLowerCase()}. Would you like a short explanation of how ${product.toLowerCase()} could help?` });
  }

  function mockRoleplay(data) {
    const situation = data.situation || "I’m not interested.";
    const reply = (data.reply || "").toLowerCase();
    let customerReply = situation;
    if (reply.includes("question") || reply.includes("how") || reply.includes("what")) customerReply = "Honestly, the biggest issue is time. I cannot stop running the business to learn another product right now.";
    else if (reply.includes("price") || reply.includes("cost") || reply.includes("cheap")) customerReply = "That is exactly my concern. I would need to understand what I am paying for before I consider it.";
    else if (reply.length > 35) customerReply = "I hear you, but I still do not see why I should change what I am doing today.";
    return normalizeRoleplay({ customerReply, mood: data.persona || "guarded", coachingHint: "Acknowledge the concern first, then ask one discovery question before explaining the product.", shouldContinue: true });
  }
  function mockSalesScore(data) { const question = /\?|how|what|why|which/i.test(data.reply || ""); return normalizeSalesScore({ clarity: 72, confidence: 68, relevance: question ? 76 : 58, listening: question ? 74 : 48, objectionHandling: question ? 66 : 55, closingStrength: 50, feedback: question ? `That response supports the goal of ${data.goal || "moving the conversation forward"}. Keep the question focused.` : "Good response, but you answered too early. Ask one discovery question first.", nextMove: "Ask what makes the customer hesitant before offering more detail.", suggestedReplies: ["I understand. What matters most to you before you decide?", "Compared with what you use today, what feels hardest to justify?", "Would it help to look at one small next step together?"] }); }

  async function callAI(payload) {
    if (!liveConfigured) {
      await wait(450);
      if (payload.task === "analyze") return mockAnalysis(payload);
      if (payload.task === "pitch") return mockPitch(payload, payload.analysis);
      if (payload.task === "sales-coach") return mockSalesCoach(payload);
      if (payload.task === "roleplay") return mockRoleplay(payload);
      return mockSalesScore(payload);
    }
    const request = requestConfig(payload.task, payload, payload.analysis);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new Error(
            "Gemini authentication failed. Check the configured credential.",
          );
        if (response.status === 429)
          throw new Error("Gemini rate limit reached. Try again in a moment.");
        throw new Error(`Gemini API error (${response.status}).`);
      }
      const output = extractOutput(await response.json());
      if (payload.task === "analyze") return normalizeAnalysis(output);
      if (payload.task === "pitch") return normalizePitch(output);
      if (payload.task === "sales-coach") return normalizeSalesCoach(output);
      if (payload.task === "roleplay") return normalizeRoleplay(output);
      return normalizeSalesScore(output);
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error("Gemini request timed out. Try again.");
      if (error instanceof TypeError)
        throw new Error(
          "Could not reach Gemini. Check your network or secure endpoint configuration.",
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function analyzeIdea(data) {
    return callAI({ task: "analyze", ...data });
  }
  async function generatePitch(data, analysis) {
    return callAI({ task: "pitch", ...data, analysis });
  }
  async function generateSalesCoach(data) { return callAI({ task: "sales-coach", ...data }); }
  async function roleplaySales(data) { return callAI({ task: "roleplay", ...data }); }
  async function scoreSalesResponse(data) { return callAI({ task: "sales-score", ...data }); }
  window.PitchPilotAI = {
    callAI,
    analyzeIdea,
    generatePitch,
    generateSalesCoach,
    roleplaySales,
    scoreSalesResponse,
    getMode: () => (liveConfigured ? "live" : "mock"),
  };
})();
