import { useEffect, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { people as peopleApi, ai } from "../api";
import PersonModal from "../components/PersonModal";
import AddPersonModal from "../components/AddPersonModal";
import "./TableView.css";

const col = createColumnHelper();

const CH = 8.5;   // approximate px per character at 0.875rem
const PAD = 24;   // left + right cell padding

function colWidth(header, rows, accessor) {
  const maxContent = rows.reduce((max, row) => {
    const val = String(row[accessor] || "");
    return val.length > max ? val.length : max;
  }, 0);
  return Math.max(header.length, maxContent) * CH + PAD;
}

function Avatar({ person }) {
  const src = person.photo_path
    ? `http://localhost:8000/${person.photo_path}`
    : person.photo_url;
  if (!src) {
    return (
      <div className="avatar-placeholder">
        {person.name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return <img className="avatar-img" src={src} alt={person.name} onError={(e) => { e.target.style.display = "none"; }} />;
}

export default function TableView() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [sorting, setSorting] = useState([]);

  const load = useCallback(async () => {
    const rows = await peopleApi.list();
    setData(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    const blob = await ai.exportCsv();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mynetwork.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    col.display({
      id: "photo",
      header: "",
      cell: ({ row }) => <Avatar person={row.original} />,
      size: 52,
    }),
    col.accessor("name",     { header: "Name",     size: colWidth("Name",     data, "name") }),
    col.accessor("title",    { header: "Title",    size: colWidth("Title",    data, "title") }),
    col.accessor("company",  { header: "Company",  size: colWidth("Company",  data, "company") }),
    col.accessor("email",    { header: "Email",    size: colWidth("Email",    data, "email") }),
    col.accessor("phone",    { header: "Phone",    size: colWidth("Phone",    data, "phone") }),
    col.accessor("location", { header: "Location", size: colWidth("Location", data, "location") }),
    col.accessor("notes", {
      header: "Notes",
      size: colWidth("Notes", data, "notes"),
      cell: ({ getValue }) => <span className="notes-cell">{getValue()}</span>,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="table-view">
      <div className="table-toolbar">
        <span className="table-count">{data.length} people</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Person</button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.column.getSize(), minWidth: h.column.getSize() }}
                    onClick={h.column.getToggleSortingHandler()}
                    className={h.column.getCanSort() ? "sortable" : ""}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => setSelected(row.original)} className="data-row">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="empty-state">No people yet. Click "Add Person" to get started.</div>
        )}
      </div>

      {selected && (
        <PersonModal
          person={selected}
          onClose={() => setSelected(null)}
          onSave={async (updated) => {
            await peopleApi.update(selected.id, updated);
            setSelected(null);
            load();
          }}
          onDelete={async () => {
            await peopleApi.delete(selected.id);
            setSelected(null);
            load();
          }}
        />
      )}

      {adding && (
        <AddPersonModal
          onClose={() => setAdding(false)}
          onSave={async (data) => {
            await peopleApi.create(data);
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}
