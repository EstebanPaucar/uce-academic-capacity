# 1. Grupo de Seguridad para el Balanceador (Entrada Web)
resource "aws_security_group" "alb_sg" {
  name        = "uce-alb-sg"
  vpc_id      = aws_vpc.uce_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. Creación del Application Load Balancer
resource "aws_lb" "uce_alb" {
  name               = "uce-academic-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet.id, aws_subnet.public_subnet_b.id]

  tags = { Name = "uce-alb-principal" }
}

# 3. Listener (Escuchador) por defecto en el puerto 80
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.uce_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Arquitectura UCE: Balanceador Activo"
      status_code  = "200"
    }
  }
}

# Target Group: A dónde va el tráfico
resource "aws_lb_target_group" "uce_tg" {
  name     = "uce-app-tg"
  port     = 4200 # Puerto del Frontend por defecto
  protocol = "HTTP"
  vpc_id   = aws_vpc.uce_vpc.id

  health_check {
    path = "/"
    port = "4200"
  }
}

# Conectar la instancia al Target Group
resource "aws_lb_target_group_attachment" "app_attach" {
  target_group_arn = aws_lb_target_group.uce_tg.arn
  target_id        = aws_instance.app_server.id
  port             = 4200
}

# Actualizar el Listener para que use este Target Group
resource "aws_lb_listener_rule" "forward_all" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.uce_tg.arn
  }

  condition {
    path_pattern {
      values = ["*"]
    }
  }
}