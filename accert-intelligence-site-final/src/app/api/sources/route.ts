import {NextResponse} from 'next/server';
import {SOURCE_CATALOG} from '@/lib/source-catalog';
export const runtime='nodejs';
export async function GET(){return NextResponse.json({sources:SOURCE_CATALOG,generatedAt:new Date().toISOString(),note:'Este catálogo descreve escopo/configuração; o status operacional é medido nas respostas de /api/research e não é inventado nem persistido entre solicitações.'},{headers:{'Cache-Control':'s-maxage=3600, stale-while-revalidate=300'}})}
