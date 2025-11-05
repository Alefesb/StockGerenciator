import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { StockMovementDialog } from "@/components/stock/StockMovementDialog";
import { format } from "date-fns";

export default function Entries() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: entries, refetch } = useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, unit)")
        .eq("type", "entry")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Entradas de Estoque</h1>
          <p className="text-muted-foreground">Registre entradas de produtos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Entradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries && entries.length > 0 ? (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{entry.products?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {entry.quantity} {entry.products?.unit}
                    </p>
                    {entry.batch_number && (
                      <p className="text-sm text-muted-foreground">Lote: {entry.batch_number}</p>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">Obs: {entry.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(entry.created_at), "dd/MM/yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma entrada registrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <StockMovementDialog
        open={isDialogOpen}
        onOpenChange={() => {
          setIsDialogOpen(false);
          refetch();
        }}
        type="entry"
      />
    </div>
  );
}
