import {
  createdAtNow,
  createId,
  optionalEnumValue,
  optionalString,
  requireString,
  type SecretaryTool,
  type ToolFactoryOptions,
  type ToolOkResult,
} from './types';

const priorities = ['low', 'medium', 'high'] as const;

export type TodoPriority = (typeof priorities)[number];

export type Todo = {
  id: string;
  title: string;
  dueDate?: string;
  priority: TodoPriority;
  completed: false;
  createdAt: string;
};

export type TodoCreateInput = {
  title: string;
  dueDate?: string;
  priority?: TodoPriority;
};

export type TodoCreateResult = ToolOkResult & {
  message: 'Todo created.';
  todo: Todo;
};

export function createTodoCreateTool({
  storage,
}: ToolFactoryOptions): SecretaryTool<TodoCreateInput, TodoCreateResult> {
  return {
    name: 'todo.create',
    description:
      'Create a local todo item for a task the user wants to remember.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title.',
        },
        dueDate: {
          type: 'string',
          description: 'Optional due date or date-time string.',
        },
        priority: {
          type: 'string',
          enum: [...priorities],
          description: 'Task priority.',
        },
      },
      required: ['title'],
    },
    async execute(input) {
      const dueDate = optionalString(input.dueDate, 'dueDate');
      const todo: Todo = {
        id: createId('todo'),
        title: requireString(input.title, 'title'),
        ...(dueDate ? { dueDate } : {}),
        priority: optionalEnumValue(
          input.priority,
          'priority',
          priorities,
          'medium',
        ),
        completed: false,
        createdAt: createdAtNow(),
      };

      await storage.appendJsonArrayItem('todos.json', todo);

      return {
        ok: true,
        message: 'Todo created.',
        todo,
      };
    },
  };
}
