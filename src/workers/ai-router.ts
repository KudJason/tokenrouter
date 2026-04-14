// AI Router Worker - Multi-Provider AI Routing
import { D1Client } from '../lib/d1';
import type { Env, ChatRequest, ChatResponse, TokenUsage, Provider, RoutingStrategy } from '../types';

/**
 * AI Router Service
 * Routes requests to different AI providers (OpenAI, Anthropic, Google, DeepSeek, SiliconFlow)
 * Only activates providers with valid API keys
 */
export class AIRouterService {
  private providers: Map<Provider, AIProvider>;

  constructor(private env: Env) {
    this.providers = new Map();

    // Only activate providers with valid API keys
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim()) {
      this.providers.set('openai', new OpenAIProvider(env.OPENAI_API_KEY));
    }
    if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim()) {
      this.providers.set('anthropic', new AnthropicProvider(env.ANTHROPIC_API_KEY));
    }
    if (env.GOOGLE_API_KEY && env.GOOGLE_API_KEY.trim()) {
      this.providers.set('google', new GoogleProvider(env.GOOGLE_API_KEY));
    }
    if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY.trim()) {
      this.providers.set('deepseek', new DeepSeekProvider(env.DEEPSEEK_API_KEY));
    }
    if (env.SILICONFLOW_API_KEY && env.SILICONFLOW_API_KEY.trim()) {
      this.providers.set('siliconflow', new SiliconFlowProvider(env.SILICONFLOW_API_KEY));
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): Provider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get default provider (first available)
   */
  private getDefaultProvider(): Provider {
    const providers = this.getAvailableProviders();
    if (providers.length === 0) {
      throw new Error('No AI providers available. Please configure at least one API key.');
    }
    return providers[0];
  }

  /**
   * Route and execute chat request with retry and fallback
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Build provider priority list (requested provider first, then others as fallback)
    const providers = this.getProviderPriorityList(request.provider);
    const requestedProvider = request.provider;

    for (const provider of providers) {
      const aiProvider = this.providers.get(provider);
      if (!aiProvider) continue;

      // Use requested model only for requested provider, otherwise use provider's default model
      const isRequestedProvider = provider === requestedProvider;
      const model = isRequestedProvider
        ? (request.model || this.getDefaultModel(provider))
        : this.getDefaultModel(provider);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await aiProvider.chat({
            messages: request.messages,
            model,
            temperature: request.temperature,
            max_tokens: request.max_tokens
          });

          const latency_ms = Date.now() - startTime;

          return {
            success: true,
            id: result.id,
            content: result.content,
            provider,
            model,
            usage: {
              prompt_tokens: result.usage.prompt_tokens,
              completion_tokens: result.usage.completion_tokens,
              total_tokens: result.usage.total_tokens,
              cost_usd: this.calculateCost(provider, model, result.usage.total_tokens)
            },
            latency_ms
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Don't retry on auth errors
          if (lastError.message.includes('401') || lastError.message.includes('403')) {
            throw lastError;
          }

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries - 1) {
            await this.delay(Math.pow(2, attempt) * 100);
          }
        }
      }
    }

    // All providers failed
    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Build priority list of providers (requested first, then others)
   */
  private getProviderPriorityList(requestedProvider?: Provider): Provider[] {
    const allProviders = this.getAvailableProviders();
    if (!requestedProvider) {
      return allProviders;
    }

    const priority: Provider[] = [requestedProvider];
    for (const p of allProviders) {
      if (p !== requestedProvider) {
        priority.push(p);
      }
    }
    return priority;
  }

  /**
   * Delay helper for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stream chat response (SSE)
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<string> {
    const provider = request.provider || this.getDefaultProvider();
    const model = request.model || this.getDefaultModel(provider);
    const aiProvider = this.providers.get(provider);

    if (!aiProvider) {
      throw new Error(`Provider ${provider} not available`);
    }

    // For now, yield chunks from non-streaming response
    // Full streaming implementation would need provider-specific SSE handling
    const result = await this.chat({ ...request, provider });
    yield result.content;
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: Provider): string {
    const defaults: Record<Provider, string> = {
      'openai': 'gpt-4o',
      'anthropic': 'claude-3-5-sonnet-latest',
      'google': 'gemini-2.0-flash',
      'deepseek': 'deepseek-chat',
      'siliconflow': 'deepseek-ai/DeepSeek-V3'  // SiliconFlow uses this model ID
    };
    return defaults[provider];
  }

  /**
   * Calculate cost in USD
   */
  private calculateCost(provider: Provider, model: string, tokens: number): number {
    // Pricing per 1M tokens (approximate)
    const pricing: Record<string, number> = {
      'openai/gpt-4o': 5,
      'openai/gpt-4o-mini': 0.15,
      'openai/gpt-4': 30,
      'anthropic/claude-3-5-sonnet-latest': 3,
      'anthropic/claude-3-5-haiku-latest': 0.8,
      'google/gemini-2.0-flash': 0,
      'google/gemini-1.5-pro': 1.25,
      'deepseek/deepseek-chat': 0.1,  // Very cheap
      'siliconflow/deepseek-ai/DeepSeek-V3': 0.1  // Via SiliconFlow
    };

    const rate = pricing[`${provider}/${model}`] || 0.1;  // Default to cheap rate
    return (tokens / 1_000_000) * rate;
  }
}

// ============ AI Provider Interfaces ============

interface AIProvider {
  chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }>;
}

class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      content: data.choices[0]?.message?.content || '',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    // Convert messages format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const conversationMessages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model,
        system: systemMessage?.content,
        messages: conversationMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        temperature: request.temperature,
        max_tokens: request.max_tokens || 1024
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      content: data.content[0]?.text || '',
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }
}

class GoogleProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    // Convert messages to Gemini format
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = request.messages.find(m => m.role === 'system');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.max_tokens
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: `gemini-${Date.now()}`,
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      usage: {
        prompt_tokens: 0, // Google doesn't always return this
        completion_tokens: 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }
}

/**
 * DeepSeek Provider
 * API: https://api.deepseek.com
 */
class DeepSeekProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'deepseek-chat',
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      content: data.choices[0]?.message?.content || '',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }
}

/**
 * SiliconFlow Provider
 * API: https://api.siliconflow.cn
 * Uses OpenAI-compatible API format
 */
class SiliconFlowProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat(request: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{
    id: string;
    content: string;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    // SiliconFlow uses OpenAI-compatible API format
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'deepseek-ai/DeepSeek-V3',
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SiliconFlow API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      content: data.choices[0]?.message?.content || '',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }
}

/**
 * Handle chat request - OpenAI Protocol
 */
export async function handleChat(
  request: Request,
  env: Env,
  authInfo?: { companyId: string }
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as ChatRequest;

    if (!body.messages || body.messages.length === 0) {
      return Response.json(
        { success: false, error: 'messages is required' },
        { status: 400 }
      );
    }

    const router = new AIRouterService(env);
    const result = await router.chat(body);

    // Record usage if company info available
    if (authInfo?.companyId && result.success) {
      const db = new D1Client(env.DB);
      const today = new Date().toISOString().split('T')[0];
      await db.incrementUsage({
        company_id: authInfo.companyId,
        date: today,
        provider: result.provider,
        model: result.model,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        cost_usd: result.usage.cost_usd
      });
    }

    // Return in OpenAI format
    return Response.json({
      id: result.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      choices: [
        {
          message: {
            role: 'assistant',
            content: result.content
          },
          finish_reason: 'stop',
          index: 0
        }
      ]
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        processing_time_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * Handle chat request - Anthropic Protocol
 */
export async function handleAnthropicChat(
  request: Request,
  env: Env,
  authInfo?: { companyId: string }
): Promise<Response> {
  const startTime = Date.now();

  try {
    const body = await request.json() as {
      model: string;
      messages: { role: string; content: string }[];
      system?: string;
      temperature?: number;
      max_tokens?: number;
      provider?: string;
    };

    if (!body.messages || body.messages.length === 0) {
      return Response.json(
        { error: 'messages is required', type: 'error' },
        { status: 400 }
      );
    }

    // Convert Anthropic format to internal format
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    // Add system message if present
    if (body.system) {
      messages.push({ role: 'system', content: body.system });
    }

    // Convert messages
    for (const msg of body.messages) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    const router = new AIRouterService(env);
    const result = await router.chat({
      messages,
      model: body.model,
      provider: body.provider as any,
      temperature: body.temperature,
      max_tokens: body.max_tokens
    });

    // Record usage if company info available
    if (authInfo?.companyId && result.success) {
      const db = new D1Client(env.DB);
      const today = new Date().toISOString().split('T')[0];
      await db.incrementUsage({
        company_id: authInfo.companyId,
        date: today,
        provider: result.provider,
        model: result.model,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        cost_usd: result.usage.cost_usd
      });
    }

    // Return in Anthropic format
    return Response.json({
      id: result.id,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: result.content
        }
      ],
      model: result.model,
      provider: result.provider,
      usage: {
        input_tokens: result.usage.prompt_tokens,
        output_tokens: result.usage.completion_tokens
      },
      stop_reason: 'end_turn'
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Internal error',
        type: 'error'
      },
      { status: 500 }
    );
  }
}
