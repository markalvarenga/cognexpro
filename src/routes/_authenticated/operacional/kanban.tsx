import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useState } from "react";
import { Plus, Trash2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

export const Route = createFileRoute("/_authenticated/operacional/kanban")({ component: Page });

type TaskStatus = "todo" | "andamento" | "revisao" | "concluido";
type Priority = "urgente" | "alta" | "media" | "baixa";

const COLUMNS: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "todo", label: "A fazer", tone: "bg-muted text-foreground" },
  { id: "andamento", label: "Em andamento", tone: "bg-primary/15 text-primary" },
  { id: "revisao", label: "Em revisão", tone: "bg-amber-500/15 text-amber-500" },
  { id: "concluido", label: "Concluído", tone: "bg-emerald-500/15 text-emerald-500" },
];

const PRIO_COLOR: Record<Priority, string> = {
  urgente: "bg-red-500/15 text-red-500 border-red-500/30",
  alta: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  media: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  baixa: "bg-muted text-muted-foreground border-border",
};

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [openBoard, setOpenBoard] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: boards = [] } = useQuery({
    queryKey: ["boards", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("boards").select("*").order("created_at")).data ?? [],
  });

  const boardId = activeBoard ?? (boards[0] as any)?.id ?? null;

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", boardId],
    enabled: !!boardId,
    queryFn: async () =>
      (await supabase.from("tasks").select("*").eq("board_id", boardId!).order("position")).data ?? [],
  });

  const createBoard = useMutation({
    mutationFn: async (p: { name: string; color: string }) => {
      const { error } = await supabase.from("boards").insert({ ...p, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Quadro criado");
      setOpenBoard(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createTask = useMutation({
    mutationFn: async (p: any) => {
      const { error } = await supabase.from("tasks").insert({ ...p, user_id: user!.id, board_id: boardId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", boardId] });
      toast.success("Tarefa criada");
      setOpenTask(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, any[]> = { todo: [], andamento: [], revisao: [], concluido: [] };
    for (const t of tasks as any[]) g[t.status as TaskStatus]?.push(t);
    return g;
  }, [tasks]);

  function onDragEnd(e: DragEndEvent) {
    const id = e.active.id as string;
    const over = e.over?.id as TaskStatus | undefined;
    if (!over) return;
    const task = (tasks as any[]).find((t) => t.id === id);
    if (!task || task.status === over) return;
    updateStatus.mutate({ id, status: over });
  }

  return (
    <>
      <PageHeader
        title="Kanban"
        subtitle="Organize tarefas por quadro"
        actions={
          <>
            <Dialog open={openBoard} onOpenChange={setOpenBoard}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Quadro
                </Button>
              </DialogTrigger>
              <BoardDialog onSubmit={(v) => createBoard.mutate(v)} />
            </Dialog>
            <Dialog open={openTask} onOpenChange={setOpenTask}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!boardId}>
                  <Plus className="w-4 h-4 mr-1" /> Tarefa
                </Button>
              </DialogTrigger>
              <TaskDialog onSubmit={(v) => createTask.mutate(v)} />
            </Dialog>
          </>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(boards as any[]).map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBoard(b.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              boardId === b.id
                ? "bg-card border-primary text-foreground"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground"
            }`}
            style={boardId === b.id ? { borderColor: b.color } : undefined}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: b.color }} />
            {b.name}
          </button>
        ))}
      </div>

      {!boardId ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-sm text-muted-foreground">
          Crie um quadro para começar.
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <Column key={col.id} col={col} count={grouped[col.id].length}>
                {grouped[col.id].map((t) => (
                  <Card key={t.id} task={t} onDelete={() => removeTask.mutate(t.id)} />
                ))}
              </Column>
            ))}
          </div>
        </DndContext>
      )}
    </>
  );
}

function Column({
  col,
  count,
  children,
}: {
  col: { id: TaskStatus; label: string; tone: string };
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={`bg-card border border-border rounded-xl p-3 min-h-[400px] transition ${
        isOver ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-1 rounded ${col.tone}`}>{col.label}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Card({ task, onDelete }: { task: any; onDelete: () => void }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-background border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge className={`text-[10px] capitalize border ${PRIO_COLOR[task.priority as Priority]}`}>
          {task.priority}
        </Badge>
        {task.due_date && (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {fmtDate(task.due_date)}
          </span>
        )}
        {task.assignee && (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {task.assignee}
          </span>
        )}
      </div>
    </div>
  );
}

function BoardDialog({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6C63FF");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo quadro</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Cor</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => name && onSubmit({ name, color })}>Criar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TaskDialog({ onSubmit }: { onSubmit: (v: any) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova tarefa</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLUMNS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            title &&
            onSubmit({
              title,
              description,
              priority,
              status,
              due_date: dueDate || null,
              assignee: assignee || null,
            })
          }
        >
          Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
