import { initGlobalTracer, Tags, FORMAT_HTTP_HEADERS } from 'opentracing';
import { Tracer } from 'opentracing';


const tracer = new Tracer();

export function trace(request: any, event: string) {
  console.group(event)
  const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, request.headers) || undefined;
  const span = tracer.startSpan(event, {
    childOf: parentSpanContext,
    tags: { [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER }
  });
  console.groupEnd()

  return span;
}
