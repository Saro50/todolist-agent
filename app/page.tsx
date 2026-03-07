import { TodoList } from "./components/todo";
import { Card } from "./components/ui/Card";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:py-12">
      <div className="max-w-xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-tight">
            Todo List
          </h1>
          <p className="text-gray-500">简洁高效的任务管理</p>
        </header>

        <Card className="bg-white/50 backdrop-blur-sm shadow-sm border-white/50">
          <Card.Body>
            <TodoList />
          </Card.Body>
        </Card>

        <footer className="text-center text-gray-400 text-sm mt-8">
          按 Enter 添加任务 · 点击圆圈标记完成
        </footer>
      </div>
    </main>
  );
}
