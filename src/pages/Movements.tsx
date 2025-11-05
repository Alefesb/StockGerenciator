import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArrowUp, ArrowDown, Settings2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { format } from "date-fns"

const movementSchema = z.object({
  product_id: z.string().min(1, "Produto é obrigatório"),
  type: z.enum(["entry", "exit", "adjustment"]),
  quantity: z.coerce.number().min(0.01, "Quantidade deve ser maior que zero"),
  batch_number: z.string().max(100, "Lote muito longo").optional(),
  expiration_date: z.string().optional(),
  notes: z.string().max(500, "Observação muito longa").optional(),
})

type MovementFormValues = z.infer<typeof movementSchema>

export default function Movements() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")
  const queryClient = useQueryClient()

  const { data: movements, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, products(name, code)")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code")
        .order("name")
      if (error) throw error
      return data
    },
  })

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: "",
      type: "entry",
      quantity: 0,
      batch_number: "",
      expiration_date: "",
      notes: "",
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: MovementFormValues) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const dataToSave = {
        product_id: values.product_id,
        type: values.type,
        quantity: values.quantity,
        batch_number: values.batch_number || null,
        expiration_date: values.expiration_date || null,
        notes: values.notes || null,
        user_id: user.id,
      }

      const { error } = await supabase.from("stock_movements").insert([dataToSave])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Movimentação registrada!")
      setDialogOpen(false)
      form.reset()
    },
    onError: () => {
      toast.error("Erro ao registrar movimentação")
    },
  })

  const onSubmit = (values: MovementFormValues) => {
    saveMutation.mutate(values)
  }

  const getMovementIcon = (type: string) => {
    if (type === "entry") return <ArrowUp className="h-4 w-4 text-success" />
    if (type === "exit") return <ArrowDown className="h-4 w-4 text-destructive" />
    return <Settings2 className="h-4 w-4 text-warning" />
  }

  const getMovementLabel = (type: string) => {
    if (type === "entry") return "Entrada"
    if (type === "exit") return "Saída"
    return "Ajuste"
  }

  const getMovementVariant = (type: string) => {
    if (type === "entry") return "success" as const
    if (type === "exit") return "destructive" as const
    return "warning" as const
  }

  const filteredMovements = movements?.filter(
    (m) => filterType === "all" || m.type === filterType
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground">Controle entradas e saídas de estoque</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Movimentações</CardTitle>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="entry">Entradas</SelectItem>
                <SelectItem value="exit">Saídas</SelectItem>
                <SelectItem value="adjustment">Ajustes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredMovements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements?.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMovementVariant(movement.type)}>
                        <span className="flex items-center gap-1">
                          {getMovementIcon(movement.type)}
                          {getMovementLabel(movement.type)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{movement.products?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {movement.products?.code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.type === "entry" && "+"}
                      {movement.type === "exit" && "-"}
                      {movement.quantity}
                    </TableCell>
                    <TableCell>{movement.batch_number || "-"}</TableCell>
                    <TableCell>
                      {movement.expiration_date
                        ? format(new Date(movement.expiration_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {movement.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
            <DialogDescription>
              Registre uma entrada, saída ou ajuste de estoque
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.code} - {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Movimentação *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="entry">Entrada</SelectItem>
                          <SelectItem value="exit">Saída</SelectItem>
                          <SelectItem value="adjustment">Ajuste</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0.01" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batch_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Lote</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LOTE123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiration_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre a movimentação"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
