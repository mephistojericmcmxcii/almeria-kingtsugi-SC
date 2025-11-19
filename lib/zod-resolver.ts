import { z } from "zod"
import type { FieldValues, ResolverResult, ResolverOptions } from "react-hook-form"

// Custom zod resolver to replace @hookform/resolvers/zod
export function zodResolver<T extends z.ZodType<any, any, any>>(schema: T) {
  return async (
    values: FieldValues,
    context: any,
    options: ResolverOptions<FieldValues>,
  ): Promise<ResolverResult<z.infer<T>>> => {
    try {
      const data = await schema.parseAsync(values)
      return {
        values: data,
        errors: {},
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, any> = {}

        error.errors.forEach((err) => {
          const path = err.path.join(".")
          if (!fieldErrors[path]) {
            fieldErrors[path] = {
              type: err.code,
              message: err.message,
            }
          }
        })

        return {
          values: {},
          errors: fieldErrors,
        }
      }

      return {
        values: {},
        errors: {
          root: {
            type: "manual",
            message: "Validation failed",
          },
        },
      }
    }
  }
}
