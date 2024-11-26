# Use an official Node.js image as the base image
FROM node:18 AS build

# Set the working directory inside the container
WORKDIR /app

# Copy only the package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the React app
RUN npm run build

# Use a lightweight web server to serve the built app
FROM nginx:alpine

# Copy the built files from the previous stage to the nginx html folder
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
