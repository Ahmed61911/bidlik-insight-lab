FROM kong:2.8.1
COPY kong.yml.template /home/kong/temp.yml
COPY kong-entrypoint.sh /home/kong/kong-entrypoint.sh
USER root
RUN chmod +x /home/kong/kong-entrypoint.sh && chown kong:kong /home/kong/temp.yml /home/kong/kong-entrypoint.sh
USER kong
ENTRYPOINT ["/home/kong/kong-entrypoint.sh"]
