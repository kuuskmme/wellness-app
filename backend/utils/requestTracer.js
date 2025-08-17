// backend/utils/requestTracer.js
/**
 * Request Tracer for debugging and monitoring the AI assistant flow
 */

class RequestTracer {
  constructor() {
    this.traces = new Map();
    this.metricsBuffer = [];
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_TRACING === 'true';
  }
  
  /**
   * Start a new trace
   */
  startTrace(sessionId, userId, message) {
    if (!this.isEnabled) return;
    
    const traceId = `${sessionId}-${Date.now()}`;
    const trace = {
      traceId,
      sessionId,
      userId,
      message: message.substring(0, 100),
      startTime: Date.now(),
      steps: [],
      metrics: {
        totalTime: 0,
        functionCalls: 0,
        tokensUsed: 0,
        cacheHits: 0
      },
      errors: []
    };
    
    this.traces.set(traceId, trace);
    
    console.log(`[Trace Started] ${traceId}`);
    console.log(`├─ User: ${userId}`);
    console.log(`├─ Message: "${message.substring(0, 50)}..."`);
    console.log(`└─ Time: ${new Date().toISOString()}`);
    
    return traceId;
  }
  
  /**
   * Add a step to the trace
   */
  addStep(traceId, stepName, data = {}) {
    if (!this.isEnabled || !this.traces.has(traceId)) return;
    
    const trace = this.traces.get(traceId);
    const step = {
      name: stepName,
      timestamp: Date.now(),
      duration: 0,
      data
    };
    
    // Calculate duration from last step
    if (trace.steps.length > 0) {
      const lastStep = trace.steps[trace.steps.length - 1];
      lastStep.duration = step.timestamp - lastStep.timestamp;
    }
    
    trace.steps.push(step);
    
    console.log(`[Trace Step] ${stepName}`);
    if (Object.keys(data).length > 0) {
      console.log(`└─ Data:`, JSON.stringify(data, null, 2).substring(0, 200));
    }
  }
  
  /**
   * Record a function call
   */
  recordFunctionCall(traceId, functionName, parameters, result) {
    if (!this.isEnabled || !this.traces.has(traceId)) return;
    
    const trace = this.traces.get(traceId);
    trace.metrics.functionCalls++;
    
    this.addStep(traceId, `Function: ${functionName}`, {
      parameters,
      resultSize: JSON.stringify(result).length,
      hasError: result.error !== null
    });
  }
  
  /**
   * Record token usage
   */
  recordTokens(traceId, tokens) {
    if (!this.isEnabled || !this.traces.has(traceId)) return;
    
    const trace = this.traces.get(traceId);
    trace.metrics.tokensUsed += tokens;
  }
  
  /**
   * Record an error
   */
  recordError(traceId, error, context = {}) {
    if (!this.traces.has(traceId)) return;
    
    const trace = this.traces.get(traceId);
    trace.errors.push({
      message: error.message,
      stack: error.stack?.substring(0, 500),
      context,
      timestamp: Date.now()
    });
    
    console.error(`[Trace Error] ${error.message}`);
    if (context) {
      console.error(`└─ Context:`, context);
    }
  }
  
  /**
   * End a trace
   */
  endTrace(traceId, response) {
    if (!this.isEnabled || !this.traces.has(traceId)) return;
    
    const trace = this.traces.get(traceId);
    trace.endTime = Date.now();
    trace.metrics.totalTime = trace.endTime - trace.startTime;
    trace.responseLength = response ? response.length : 0;
    
    // Calculate last step duration
    if (trace.steps.length > 0) {
      const lastStep = trace.steps[trace.steps.length - 1];
      lastStep.duration = trace.endTime - lastStep.timestamp;
    }
    
    // Print summary
    this.printTraceSummary(trace);
    
    // Store metrics for analysis
    this.storeMetrics(trace);
    
    // Clean up old traces (keep last 100)
    if (this.traces.size > 100) {
      const oldestKey = this.traces.keys().next().value;
      this.traces.delete(oldestKey);
    }
    
    return trace;
  }
  
  /**
   * Print trace summary
   */
  printTraceSummary(trace) {
    console.log(`\n[Trace Complete] ${trace.traceId}`);
    console.log(`├─ Total Time: ${trace.metrics.totalTime}ms`);
    console.log(`├─ Steps: ${trace.steps.length}`);
    console.log(`├─ Function Calls: ${trace.metrics.functionCalls}`);
    console.log(`├─ Tokens Used: ${trace.metrics.tokensUsed}`);
    console.log(`├─ Errors: ${trace.errors.length}`);
    console.log(`└─ Response Length: ${trace.responseLength} chars`);
    
    // Show step breakdown if verbose
    if (process.env.TRACE_VERBOSE === 'true') {
      console.log('\nStep Breakdown:');
      trace.steps.forEach((step, index) => {
        const prefix = index === trace.steps.length - 1 ? '└─' : '├─';
        console.log(`${prefix} ${step.name}: ${step.duration}ms`);
      });
    }
    
    // Show errors if any
    if (trace.errors.length > 0) {
      console.log('\n⚠️  Errors occurred:');
      trace.errors.forEach(error => {
        console.log(`├─ ${error.message}`);
      });
    }
  }
  
  /**
   * Store metrics for analysis
   */
  storeMetrics(trace) {
    const metrics = {
      timestamp: new Date(),
      sessionId: trace.sessionId,
      userId: trace.userId,
      totalTime: trace.metrics.totalTime,
      functionCalls: trace.metrics.functionCalls,
      tokensUsed: trace.metrics.tokensUsed,
      steps: trace.steps.length,
      errors: trace.errors.length,
      responseLength: trace.responseLength
    };
    
    this.metricsBuffer.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer.shift();
    }
  }
  
  /**
   * Get performance statistics
   */
  getStatistics() {
    if (this.metricsBuffer.length === 0) {
      return null;
    }
    
    const stats = {
      totalRequests: this.metricsBuffer.length,
      averageResponseTime: 0,
      averageTokens: 0,
      averageFunctionCalls: 0,
      errorRate: 0,
      percentiles: {
        p50: 0,
        p90: 0,
        p99: 0
      }
    };
    
    // Calculate averages
    const times = this.metricsBuffer.map(m => m.totalTime).sort((a, b) => a - b);
    stats.averageResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    stats.averageTokens = Math.round(
      this.metricsBuffer.reduce((sum, m) => sum + m.tokensUsed, 0) / this.metricsBuffer.length
    );
    stats.averageFunctionCalls = (
      this.metricsBuffer.reduce((sum, m) => sum + m.functionCalls, 0) / this.metricsBuffer.length
    ).toFixed(1);
    
    // Calculate error rate
    const errorCount = this.metricsBuffer.filter(m => m.errors > 0).length;
    stats.errorRate = ((errorCount / this.metricsBuffer.length) * 100).toFixed(1) + '%';
    
    // Calculate percentiles
    stats.percentiles.p50 = times[Math.floor(times.length * 0.5)];
    stats.percentiles.p90 = times[Math.floor(times.length * 0.9)];
    stats.percentiles.p99 = times[Math.floor(times.length * 0.99)];
    
    return stats;
  }
  
  /**
   * Get trace by ID
   */
  getTrace(traceId) {
    return this.traces.get(traceId);
  }
  
  /**
   * Clear all traces
   */
  clearTraces() {
    this.traces.clear();
    this.metricsBuffer = [];
    console.log('[Tracer] All traces cleared');
  }
  
  /**
   * Export traces for debugging
   */
  exportTraces() {
    return {
      traces: Array.from(this.traces.values()),
      statistics: this.getStatistics(),
      exportedAt: new Date()
    };
  }
}

module.exports = new RequestTracer();