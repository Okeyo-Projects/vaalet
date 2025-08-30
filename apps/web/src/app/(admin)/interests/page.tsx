import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Intérêts</CardTitle>
          <CardDescription>
            Gérez vos centres d’intérêt pour personnaliser vos résultats.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Technologie</Badge>
          <Badge variant="secondary">Mode</Badge>
          <Badge variant="secondary">Maison</Badge>
          <Badge variant="secondary">Sports</Badge>
          <Badge variant="secondary">Voyage</Badge>
          <div className="w-full" />
          <Button className="mt-1">Modifier mes intérêts</Button>
        </CardContent>
      </Card>
    </div>
  )
}


