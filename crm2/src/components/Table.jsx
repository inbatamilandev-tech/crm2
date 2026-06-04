import React from 'react';

export default function Table({ columns, data }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#0F172A]/20">
        <thead className="bg-[#0F172A] sticky top-0 z-20">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className="px-6 py-3 text-left text-xs font-black text-[#F8FAFC] uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[#F8FAFC] divide-y divide-[#0F172A]/20">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-[#0F172A]/20 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A] font-medium">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
