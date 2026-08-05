import { Prisma } from "@/generated/prisma/client";



export function toJson(
  value: unknown,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toNullableJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value as Prisma.InputJsonValue;
}