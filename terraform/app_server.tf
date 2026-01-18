# 1. Grupo de Seguridad para el Servidor de Aplicaciones
resource "aws_security_group" "app_sg" {
  name        = "uce-app-sg"
  vpc_id      = aws_vpc.uce_vpc.id

  # Permitir tráfico desde el Balanceador (ALB)
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  # Permitir SSH solo desde el Bastion
  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Instancia de EC2 para los Microservicios
resource "aws_instance" "app_server" {
  ami           = "ami-0c7217cdde317cfec"
  instance_type = "t2.small"
  key_name      = "vockey" # <--- AGREGA ESTA LÍNEA TAMBIÉN
  subnet_id     = aws_subnet.private_subnet.id
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  # SCRIPT DE AUTOMATIZACIÓN (User Data)
  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y docker git
              service docker start
              systemctl enable docker
              # Instalar Docker Compose
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              EOF

  tags = { Name = "uce-app-server-production" }
}