import { tool } from "ai";
import { z } from "zod";
import { supabase } from "./supabase";

export const cadastrarCliente = tool({
  description:
    "Cadastra um novo cliente (hospital) na base. Use quando o usuário quiser adicionar/registrar um cliente E já tiver fornecido nome E CNPJ. Se faltar algum dos dois, não chame esta ferramenta — pergunte ao usuário antes.",
  inputSchema: z.object({
    nome: z
      .string()
      .min(2, "Nome muito curto")
      .max(120, "Nome muito longo")
      .describe("Nome do hospital/cliente, entre 2 e 120 caracteres."),
    cnpj: z
      .string()
      .describe(
        "CNPJ do hospital. Aceita com ou sem pontuação; apenas os 14 dígitos serão usados.",
      ),
  }),
  execute: async ({ nome, cnpj }) => {
    const cnpjDigitos = cnpj.replace(/\D/g, "");

    if (cnpjDigitos.length !== 14) {
      return {
        ok: false as const,
        error: "CNPJ deve ter exatamente 14 dígitos.",
      };
    }

    const { data, error } = await supabase
      .from("clientes")
      .insert({ nome, cnpj: cnpjDigitos })
      .select("id, nome, cnpj")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "CNPJ já cadastrado" };
      }
      console.error("[cadastrarCliente] erro:", error);
      return { ok: false as const, error: "Falha ao cadastrar" };
    }

    return { ok: true as const, cliente: data };
  },
});

export const listarClientes = tool({
  description:
    "Lista os clientes (hospitais) já cadastrados, do mais recente para o mais antigo. Use quando o usuário quiser ver, consultar ou listar os clientes existentes.",
  inputSchema: z.object({
    limite: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Quantidade máxima de clientes a retornar (1 a 20). Padrão: 10."),
  }),
  execute: async ({ limite }) => {
    const max = limite ?? 10;

    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, cnpj, created_at")
      .order("created_at", { ascending: false })
      .limit(max);

    if (error) {
      console.error("[listarClientes] erro:", error);
      return { ok: false as const, error: "Falha ao listar" };
    }

    return { ok: true as const, clientes: data };
  },
});

export const tools = { cadastrarCliente, listarClientes };
