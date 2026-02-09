"use client";

import { type ReactNode } from "react";

/**
 * NOTA: O Hero UI v3 beta 6 não possui componente Table nativo.
 * Este componente será implementado posteriormente usando:
 * - HTML table nativo + Tailwind CSS
 * - Ou aguardar release oficial do Table no Hero UI v3
 * - Ou usar @tanstack/react-table
 * 
 * Por enquanto, este é um placeholder.
 */

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  render?: (item: T) => ReactNode;
  width?: string | number;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((item: T) => string);
  isLoading?: boolean;
  
  // Paginação
  enablePagination?: boolean;
  rowsPerPage?: number;
  
  // Busca
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  
  // Empty state
  emptyMessage?: string;
  
  // Sorting
  defaultSortKey?: string;
  defaultSortDirection?: "ascending" | "descending";
  
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyMessage = "Nenhum registro encontrado",
}: DataTableProps<T>) {
  const getRowKey = (item: T, idx: number): string => {
    if (!rowKey) return String(idx);
    return typeof rowKey === "function" ? rowKey(item) : String(item[rowKey]);
  };

  const getAlignClass = (align?: "left" | "center" | "right"): string => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-divider bg-content1 shadow-sm">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="border-b border-divider bg-default-100/50 text-default-500 uppercase font-semibold">
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={`px-4 py-3 ${getAlignClass(col.align)}`}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider">
          {data.length > 0 ? (
            data.map((item, idx) => (
              <tr key={getRowKey(item, idx)} className="hover:bg-default-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-4 text-default-700 ${getAlignClass(col.align)}`}>
                    {col.render ? col.render(item) : (item[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center text-default-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
