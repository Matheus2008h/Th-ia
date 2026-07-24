import { evaluate } from 'mathjs';

/**
 * Avalia uma expressão matemática de forma segura (mathjs não executa código
 * arbitrário como o eval do JS — só entende matemática/álgebra/unidades).
 */
export function calculate(expression: string): { result: string; error?: string } {
  try {
    const value = evaluate(expression);
    return { result: typeof value === 'object' ? value.toString() : String(value) };
  } catch (err: any) {
    return { result: '', error: `Não consegui calcular "${expression}": ${err.message}` };
  }
}
