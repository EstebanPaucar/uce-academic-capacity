output "alb_dns_name" {
  value       = aws_lb.uce_alb.dns_name
  description = "URL pública para acceder al sistema"
}

# 1. Agrega la IP del Bastion (Tu puerta de entrada)
output "bastion_public_ip" {
  value       = aws_instance.bastion_host.public_ip
  description = "IP pública del Bastion para acceso SSH"
}

# 2. Agrega la IP Privada del Servidor de Apps (Donde vive el código)
output "app_server_private_ip" {
  value       = aws_instance.app_server.private_ip
  description = "IP privada del servidor de aplicaciones para el salto"
}