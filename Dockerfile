FROM nginx:alpine
# set working directory
WORKDIR /usr/share/nginx/html
# copy source code to working directory
COPY ./src /usr/share/nginx/html
# expose port
EXPOSE 30026
# start nginx
CMD ["nginx", "-g", "daemon off;"]