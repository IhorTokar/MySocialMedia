# Встановлюємо офіційний Node образ
FROM node:18

# Встановлюємо робочу директорію в контейнері
WORKDIR /app

# Копіюємо package.json і package-lock.json
COPY package*.json ./

# Встановлюємо залежності
RUN npm install

# Копіюємо всі файли проекту в контейнер
COPY . .

# Компілюємо TypeScript
RUN npm run build

# Вказуємо порт
EXPOSE 5000

# Запускаємо застосунок
CMD ["npm", "start"]
