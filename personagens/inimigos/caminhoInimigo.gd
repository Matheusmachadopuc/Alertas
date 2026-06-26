extends PathFollow2D

@export var speed = 150.0
@export var velocidade_giro = 90.0
@export var ajuste_angulo = -90.0

@onready var inimigo = $inimigo

func _ready():
	rotates = false
	inimigo.rotation_degrees = ajuste_angulo

func _process(delta):
	var posicao_anterior = global_position

	progress += speed * delta

	var direcao = global_position - posicao_anterior

	if direcao.length() > 0.1:
		var angulo_alvo = direcao.angle() + deg_to_rad(ajuste_angulo)

		inimigo.global_rotation = rotate_toward(
			inimigo.global_rotation,
			angulo_alvo,
			deg_to_rad(velocidade_giro) * delta
		)
