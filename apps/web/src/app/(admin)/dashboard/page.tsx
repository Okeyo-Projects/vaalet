import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"

const data = [
  { id: 1, header: "Overview", type: "Outline", status: "Done", target: "10", limit: "20", reviewer: "Assign reviewer" },
  { id: 2, header: "KPIs", type: "Outline", status: "In Progress", target: "15", limit: "30", reviewer: "Assign reviewer" },
]

export default function Page() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable data={data} />
    </>
  )
}


