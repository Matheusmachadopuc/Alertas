extends ParallaxBackground

# Controla a velocidade base da animação. Pode ajustar conforme o clima do jogo.
@export var scroll_speed: float = 100.0

func _process(delta: float) -> void:
	# Subtrai o valor no eixo X para mover a cidade da direita para a esquerda.
	# O delta garante que o movimento seja suave independente do framerate.
	scroll_offset.x -= scroll_speed * delta
