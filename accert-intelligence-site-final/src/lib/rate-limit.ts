const buckets=new Map<string,{count:number;resetAt:number}>();let calls=0;
/** Best-effort per-isolate guard only; must not be described as distributed production protection. */
export function rateLimit(key:string,max:number,windowMs=60_000){const now=Date.now();if(++calls%100===0){for(const [k,v] of buckets)if(now>=v.resetAt)buckets.delete(k);if(buckets.size>10000){const first=buckets.keys().next().value;if(first)buckets.delete(first)}}let b=buckets.get(key);if(!b||now>=b.resetAt){b={count:0,resetAt:now+windowMs};buckets.set(key,b)}b.count++;return {allowed:b.count<=max,remaining:Math.max(0,max-b.count),resetAt:b.resetAt}}
export function clearRateLimitForTests(){buckets.clear()}
